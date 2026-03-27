const { getDriver } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const formatStudent = (record) => {
  const s = record.get("s").properties;
  const courses = record.has("courses") ? record.get("courses") : [];

  return {
    _id: s.id,
    student_id: s.student_id || s.studentId,
    name: s.name,
    email: s.email,
    address: s.address || "",
    phone: s.phone || "",
    date_of_birth: s.date_of_birth || s.dateOfBirth || "",
    // Maps properties so it works perfectly with ANY version of your frontend
    courses: courses
      .filter((c) => c != null)
      .map((c) => ({
        _id: c.properties.id,
        code: c.properties.courseCode || c.properties.course_code || "Unknown",
        courseCode:
          c.properties.courseCode || c.properties.course_code || "Unknown",
        courseName: c.properties.courseName || c.properties.course_name || "",
      })),
  };
};

exports.getStudents = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(`
            MATCH (s:Student)
            OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
            WITH s, collect(c) AS courses
            RETURN s, courses
            ORDER BY s.createdAt DESC
        `);
    res.json(result.records.map(formatStudent));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

exports.getStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
            MATCH (s:Student) 
            WHERE s.student_id = $id OR s.studentId = $id OR s.id = $id
            OPTIONAL MATCH (s)-[:ENROLLED_IN]->(c:Course)
            WITH s, collect(c) AS courses
            RETURN s, courses
        `,
      { id: req.params.id },
    );

    if (result.records.length === 0)
      return res.status(404).json({ message: "Student not found" });
    res.json(formatStudent(result.records[0]));
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

exports.createStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    // Look for any variation of course data the frontend might send
    const {
      student_id,
      name,
      email,
      address,
      phone,
      date_of_birth,
      course_ids,
      course_codes,
      courses,
    } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    const identifiers = course_ids || course_codes || courses || [];

    await session.executeWrite(async (tx) => {
      await tx.run(
        `
                CREATE (s:Student {
                    id: $id,
                    studentId: $student_id,
                    student_id: $student_id,
                    name: $name,
                    email: $email,
                    address: $address,
                    phone: $phone,
                    date_of_birth: $date_of_birth,
                    createdAt: $now,
                    updatedAt: $now
                })
            `,
        { id, student_id, name, email, address, phone, date_of_birth, now },
      );

      // SMART MATCH: Links course by UUID OR exact course code string
      if (identifiers.length > 0) {
        await tx.run(
          `
                    MATCH (s:Student {id: $id})
                    UNWIND $identifiers AS identifier
                    MATCH (c:Course) 
                    WHERE c.id = identifier OR c.courseCode = identifier OR c.course_code = identifier
                    MERGE (s)-[:ENROLLED_IN]->(c)
                `,
          { id, identifiers },
        );
      }
    });

    res.status(201).json({ message: "Student created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

exports.updateStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const {
      student_id,
      name,
      email,
      address,
      phone,
      date_of_birth,
      course_ids,
      course_codes,
      courses,
    } = req.body;
    const now = new Date().toISOString();
    const identifiers = course_ids || course_codes || courses || [];

    await session.executeWrite(async (tx) => {
      const updateRes = await tx.run(
        `
                MATCH (s:Student) 
                WHERE s.student_id = $paramId OR s.studentId = $paramId OR s.id = $paramId
                SET s.student_id = $student_id,
                    s.studentId = $student_id,
                    s.name = $name,
                    s.email = $email,
                    s.address = $address,
                    s.phone = $phone,
                    s.date_of_birth = $date_of_birth,
                    s.updatedAt = $now
                RETURN s.id as internal_id
            `,
        {
          paramId: req.params.id,
          student_id,
          name,
          email,
          address,
          phone,
          date_of_birth,
          now,
        },
      );

      if (updateRes.records.length === 0) throw new Error("NOT_FOUND");
      const internal_id = updateRes.records[0].get("internal_id");

      await tx.run(
        `
                MATCH (s:Student {id: $internal_id})-[r:ENROLLED_IN]->() 
                DELETE r
            `,
        { internal_id },
      );

      if (identifiers.length > 0) {
        await tx.run(
          `
                    MATCH (s:Student {id: $internal_id})
                    UNWIND $identifiers AS identifier
                    MATCH (c:Course) 
                    WHERE c.id = identifier OR c.courseCode = identifier OR c.course_code = identifier
                    MERGE (s)-[:ENROLLED_IN]->(c)
                `,
          { internal_id, identifiers },
        );
      }
    });

    res.status(200).json({ message: "Student updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};

exports.deleteStudent = async (req, res) => {
  const session = getDriver().session();
  try {
    const result = await session.run(
      `
            MATCH (s:Student) 
            WHERE s.student_id = $id OR s.studentId = $id OR s.id = $id
            DETACH DELETE s RETURN count(s) AS deleted
        `,
      { id: req.params.id },
    );

    if (result.records[0].get("deleted").toNumber() === 0)
      return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.close();
  }
};
