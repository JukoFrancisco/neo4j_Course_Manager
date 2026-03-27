const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Helper to format faculty node with courses
const formatFaculty = (record) => {
  const node = record.get("f").properties;
  const courses = record.has("courses") ? record.get("courses") : [];
  return {
    _id: node.id,
    name: node.name,
    email: node.email || "", // === Mapped new field ===
    address: node.address,
    department: node.department,
    courses: courses
      .filter((c) => c != null)
      .map((c) => ({
        _id: c.properties.id,
        courseCode: c.properties.courseCode || c.properties.course_code,
        courseName: c.properties.courseName || c.properties.course_name,
      })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
};

const MATCH_FACULTY_FULL = `
    MATCH (f:Faculty)
    OPTIONAL MATCH (f)-[:TEACHES]->(c:Course)
    WITH f, collect(DISTINCT c) AS courses
    RETURN f, courses
    ORDER BY f.createdAt DESC`;

const MATCH_FACULTY_BY_ID = `
    MATCH (f:Faculty {id: $id})
    OPTIONAL MATCH (f)-[:TEACHES]->(c:Course)
    WITH f, collect(DISTINCT c) AS courses
    RETURN f, courses`;

// Get all faculty
exports.getFaculties = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_FACULTY_FULL);
    res.json(result.records.map(formatFaculty));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Get single faculty
exports.getFaculty = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(MATCH_FACULTY_BY_ID, {
      id: req.params.id,
    });
    if (result.records.length === 0)
      return res.status(404).json({ message: "Faculty not found" });
    res.json(formatFaculty(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Create faculty
exports.createFaculty = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, email, address, department, courses } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    await session.executeWrite(async (tx) => {
      await tx.run(
        `CREATE (f:Faculty {
                    id: $id,
                    name: $name,
                    email: $email, // === Saved new field ===
                    address: $address,
                    department: $department,
                    createdAt: $now,
                    updatedAt: $now
                })`,
        { id, name, email, address, department, now },
      );

      if (courses && courses.length > 0) {
        await tx.run(
          `MATCH (f:Faculty {id: $id})
                     UNWIND $courseIds AS courseId
                     MATCH (c:Course {id: courseId})
                     MERGE (f)-[:TEACHES]->(c)`,
          { id, courseIds: courses },
        );
      }
    });

    const result = await session.run(MATCH_FACULTY_BY_ID, { id });
    res.status(201).json(formatFaculty(result.records[0]));
  } catch (error) {
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Update faculty
exports.updateFaculty = async (req, res) => {
  const session = getDriver().session();
  try {
    const { name, email, address, department, courses } = req.body;
    const now = new Date().toISOString();

    await session.executeWrite(async (tx) => {
      const updateResult = await tx.run(
        `MATCH (f:Faculty {id: $id})
                 SET f.name = $name,
                     f.email = $email, // === Updated new field ===
                     f.address = $address,
                     f.department = $department,
                     f.updatedAt = $now
                 RETURN f`,
        { id: req.params.id, name, email, address, department, now },
      );

      if (updateResult.records.length === 0) throw new Error("NOT_FOUND");

      await tx.run(`MATCH (f:Faculty {id: $id})-[r:TEACHES]->() DELETE r`, {
        id: req.params.id,
      });

      if (courses && courses.length > 0) {
        await tx.run(
          `MATCH (f:Faculty {id: $facultyId})
                     UNWIND $courseIds AS courseId
                     MATCH (c:Course {id: courseId})
                     MERGE (f)-[:TEACHES]->(c)`,
          { facultyId: req.params.id, courseIds: courses },
        );
      }
    });

    const finalResult = await session.run(MATCH_FACULTY_BY_ID, {
      id: req.params.id,
    });
    res.json(formatFaculty(finalResult.records[0]));
  } catch (error) {
    if (error.message === "NOT_FOUND")
      return res.status(404).json({ message: "Faculty not found" });
    res.status(400).json({ message: error.message });
  } finally {
    await session.close();
  }
};

// Delete faculty
exports.deleteFaculty = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      "MATCH (f:Faculty {id: $id}) DETACH DELETE f RETURN count(f) AS deleted",
      { id: req.params.id },
    );
    const deleted = result.records[0].get("deleted").toNumber();
    if (deleted === 0)
      return res.status(404).json({ message: "Faculty not found" });
    res.json({ message: "Faculty deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};
