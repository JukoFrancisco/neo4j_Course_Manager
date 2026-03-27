const API_URL = "http://localhost:5001/api/faculty";
const COURSES_API_URL = "http://localhost:5001/api/courses";

const form = document.getElementById("faculty-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const facultyIdInput = document.getElementById("faculty-id");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const addressInput = document.getElementById("address");
const departmentInput = document.getElementById("department");
const coursesSelect = document.getElementById("courses");
const tbody = document.getElementById("faculty-tbody");
const noFacultyMsg = document.getElementById("no-faculty");

let isEditing = false;
let allCourses = [];

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

document.addEventListener("DOMContentLoaded", async () => {
  await fetchCoursesForSelect();
  await fetchFaculties();
});

form.addEventListener("submit", handleSubmit);
cancelBtn.addEventListener("click", resetForm);

async function fetchCoursesForSelect() {
  try {
    const response = await fetch(COURSES_API_URL);
    allCourses = await response.json();
    populateCourseSelect();
  } catch (error) {
    console.error("Error fetching courses:", error);
  }
}

function populateCourseSelect(selectedIds = []) {
  coursesSelect.innerHTML = "";
  allCourses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course._id;
    const code = course.courseCode || course.course_code || "";
    const name = course.courseName || course.course_name || "";
    option.textContent = `${code} - ${name}`;

    if (selectedIds.includes(course._id)) {
      option.selected = true;
    }
    coursesSelect.appendChild(option);
  });
}

function getSelectedCourses() {
  const selected = [];
  for (const option of coursesSelect.options) {
    if (option.selected) {
      selected.push(option.value);
    }
  }
  return selected;
}

async function fetchFaculties() {
  try {
    const response = await fetch(API_URL);
    const faculties = await response.json();
    renderFaculties(faculties);
  } catch (error) {
    console.error("Error fetching faculty:", error);
  }
}

function renderFaculties(faculties) {
  tbody.innerHTML = "";

  if (faculties.length === 0) {
    noFacultyMsg.classList.remove("hidden");
    return;
  }

  noFacultyMsg.classList.add("hidden");

  faculties.forEach((faculty) => {
    const row = document.createElement("tr");
    const courseNames =
      faculty.courses && faculty.courses.length > 0
        ? faculty.courses
            .map((c) =>
              escapeHtml(
                `${c.courseCode || c.course_code} - ${c.courseName || c.course_name}`,
              ),
            )
            .join(", ")
        : "-";

    row.innerHTML = `
            <td>${escapeHtml(faculty.name)}</td>
            <td>${escapeHtml(faculty.email || "")}</td>
            <td>${escapeHtml(faculty.address)}</td>
            <td>${escapeHtml(faculty.department)}</td>
            <td title="${courseNames}">${courseNames}</td>
            <td class="table-actions">
                <button class="action-btn btn-edit" onclick="editFaculty('${faculty._id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn btn-delete" onclick="deleteFaculty('${faculty._id}')"><i class="fas fa-trash-alt"></i> Delete</button>
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

  const facultyData = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    address: addressInput.value.trim(),
    department: departmentInput.value.trim(),
    courses: getSelectedCourses(),
  };

  try {
    if (isEditing) {
      const response = await fetch(`${API_URL}/${facultyIdInput.value}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facultyData),
      });
      if (response.ok) showToast("Faculty updated successfully!", "success");
    } else {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facultyData),
      });
      if (response.ok) showToast("Faculty added successfully!", "success");
    }

    resetForm();
    fetchFaculties();
  } catch (error) {
    console.error("Error saving faculty:", error);
    showToast("Error saving faculty data.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

async function editFaculty(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const faculty = await response.json();

    facultyIdInput.value = faculty._id;
    nameInput.value = faculty.name;
    emailInput.value = faculty.email || "";
    addressInput.value = faculty.address;
    departmentInput.value = faculty.department;

    const courseIds = faculty.courses ? faculty.courses.map((c) => c._id) : [];
    populateCourseSelect(courseIds);

    isEditing = true;
    formTitle.textContent = "Edit Faculty";
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Faculty';
    submitBtn.className = "btn btn-edit-submit";
    cancelBtn.classList.remove("hidden");

    nameInput.focus();
  } catch (error) {
    console.error("Error fetching faculty:", error);
  }
}

async function deleteFaculty(id) {
  if (!confirm("Are you sure you want to delete this faculty member?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (response.ok) {
      showToast("Faculty member deleted.", "success");
      fetchFaculties();
    }
  } catch (error) {
    console.error("Error deleting faculty:", error);
    showToast("Failed to delete faculty.", "error");
  }
}

function resetForm() {
  form.reset();
  facultyIdInput.value = "";
  isEditing = false;
  formTitle.textContent = "Add New Faculty";
  submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Faculty';
  submitBtn.className = "btn btn-add";
  cancelBtn.classList.add("hidden");
  populateCourseSelect([]);
}
