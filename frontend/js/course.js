const API_URL = "http://localhost:5001/api/courses";

const form = document.getElementById("course-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const courseIdInput = document.getElementById("course-id");
const courseCodeInput = document.getElementById("course-code");
const courseNameInput = document.getElementById("course-name");
const descriptionInput = document.getElementById("description");
const creditsInput = document.getElementById("credits");
const tbody = document.getElementById("course-tbody");
const noCoursesMsg = document.getElementById("no-courses");

let isEditing = false;

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icon =
    type === "success"
      ? '<i class="fas fa-check-circle"></i>'
      : '<i class="fas fa-exclamation-circle"></i>';
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
// ---------------------------------

document.addEventListener("DOMContentLoaded", fetchCourses);

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchCourses() {
  try {
    const response = await fetch(API_URL);
    const courses = await response.json();
    renderCourses(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
  }
}

function renderCourses(courses) {
  tbody.innerHTML = "";

  if (courses.length === 0) {
    noCoursesMsg.classList.remove("hidden");
    return;
  }

  noCoursesMsg.classList.add("hidden");

  courses.forEach((course) => {
    const row = document.createElement("tr");

    const studentNames =
      course.students && course.students.length > 0
        ? course.students
            .map(
              (s) =>
                `<span class="badge">${escapeHtml(`${s.studentId || "N/A"} - ${s.name}`)}</span>`,
            )
            .join("")
        : '<span class="badge empty">No students</span>';

    const facultyNames =
      course.faculty && course.faculty.length > 0
        ? course.faculty
            .map((f) => `<span class="badge">${escapeHtml(f.name)}</span>`)
            .join("")
        : '<span class="badge empty">No faculty</span>';

    row.innerHTML = `
            <td><strong>${escapeHtml(course.courseCode)}</strong></td>
            <td class="wrap-cell">${escapeHtml(course.courseName)}</td>
            <td class="wrap-cell" title="${escapeHtml(course.description || "")}">${escapeHtml(course.description || "-")}</td>
            <td>${course.credits ?? "-"}</td>
            <td class="wrap-cell">${studentNames}</td>
            <td class="wrap-cell">${facultyNames}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" onclick="editCourse('${course._id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn btn-delete" onclick="deleteCourse('${course._id}')"><i class="fas fa-trash-alt"></i> Delete</button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function escapeHtml(text) {
  if (!text) return "";

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function handleSubmit(e) {
  e.preventDefault();
  submitBtn.disabled = true; // Prevent double clicks

  const courseData = {
    courseCode: courseCodeInput.value.trim(),
    courseName: courseNameInput.value.trim(),
    description: descriptionInput.value.trim(),
    credits: creditsInput.value ? Number(creditsInput.value) : null,
  };

  try {
    if (isEditing) {
      const response = await fetch(`${API_URL}/${courseIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });
      if (response.ok) showToast("Course updated successfully!", "success");
    } else {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseData),
      });
      if (response.ok) showToast("Course added successfully!", "success");
    }

    resetForm();
    fetchCourses();
  } catch (error) {
    console.error("Error saving course:", error);
    showToast("Error saving course data.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function editCourse(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const course = await response.json();

    courseIdInput.value = course._id;
    courseCodeInput.value = course.courseCode;
    courseNameInput.value = course.courseName;
    descriptionInput.value = course.description || "";
    creditsInput.value = course.credits ?? "";

    isEditing = true;
    formTitle.textContent = "Edit Course";
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Course';
    submitBtn.className = "btn btn-edit-submit";
    cancelBtn.classList.remove("hidden");

    courseCodeInput.focus();
  } catch (error) {
    console.error("Error fetching course:", error);
  }
}

async function deleteCourse(id) {
  if (!confirm("Are you sure you want to delete this course?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (response.ok) {
      showToast("Course deleted.", "success");
      fetchCourses();
    }
  } catch (error) {
    console.error("Error deleting course:", error);
    showToast("Failed to delete course.", "error");
  }
}

function resetForm() {
  form.reset();
  courseIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Course";
  submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Course';
  submitBtn.className = "btn btn-add";
  cancelBtn.classList.add("hidden");
}
