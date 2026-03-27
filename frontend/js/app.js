document.addEventListener("DOMContentLoaded", () => {
  const studentForm = document.getElementById("student-form");
  const studentList = document.getElementById("student-list");
  const courseCodesSelect = document.getElementById("course_codes");
  const submitBtn = document.getElementById("submit-btn");
  const cancelBtn = document.getElementById("cancel-btn");

  const studentIdOriginalInput = document.getElementById("student_id_original");
  const studentIdInput = document.getElementById("student_id");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const addressInput = document.getElementById("address");
  const phoneInput = document.getElementById("phone");
  const dobInput = document.getElementById("date_of_birth");

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

    // Trigger slide-in animation
    setTimeout(() => toast.classList.add("show"), 10);

    // Remove toast automatically after 3.5 seconds
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400); // Wait for slide-out transition
    }, 3500);
  }
  // ---------------------------------
  let originalStudentId = "";

  // --- DATE OF BIRTH SETTINGS ---
  // Calculate constraint: Student must be at least 15 years old
  const today = new Date();
  const maxAgeDate = new Date(
    today.getFullYear() - 15,
    today.getMonth(),
    today.getDate(),
  );

  // Initialize beautiful date picker
  const dobPicker = flatpickr("#date_of_birth", {
    dateFormat: "Y-m-d", // The clean format saved to the database
    altInput: true, // Creates a beautiful secondary input box
    altFormat: "F j, Y", // The format the user actually sees (e.g., March 26, 2010)
    maxDate: maxAgeDate, // Enforces the age constraint!
    disableMobile: "true",
  });

  // Helper to format dates in the table nicely
  const formatTableDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  // ------------------------------

  fetchCoursesForSelect();
  fetchStudents();

  async function fetchCoursesForSelect() {
    try {
      const response = await fetch("http://localhost:5001/api/courses");
      const courses = await response.json();

      courseCodesSelect.innerHTML = "";

      courses.forEach((course) => {
        const option = document.createElement("option");
        // CRITICAL FIX: Use the unique _id for the value
        option.value = course._id;

        const code = course.courseCode || course.course_code || "";
        const name = course.courseName || course.course_name || "";
        option.textContent = `${code} - ${name}`;
        courseCodesSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching courses for select:", error);
    }
  }

  async function fetchStudents() {
    try {
      const response = await fetch("http://localhost:5001/api/students");
      const students = await response.json();

      studentList.innerHTML = "";

      if (students.length === 0) {
        studentList.innerHTML =
          "<tr><td colspan='8' class='no-data'>No students found. Add one!</td></tr>";
        return;
      }

      students.forEach((student) => {
        const tr = document.createElement("tr");

        // Read the mapped courses correctly
        const enrolledCourses =
          student.courses && student.courses.length > 0
            ? student.courses.map((c) => c.code).join(", ")
            : "Not enrolled";

        tr.innerHTML = `
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.address || ""}</td>
                    <td>${student.phone || ""}</td>

    <td>${student.date_of_birth ? formatTableDate(student.date_of_birth) : ""}</td>
                    <td title="${enrolledCourses}">${enrolledCourses}</td>
                    <td class="table-actions">
                        <button class="action-btn btn-edit" data-id="${student.student_id}"><i class="fas fa-edit"></i> Edit</button>
<button class="action-btn btn-delete" data-id="${student.student_id}"><i class="fas fa-trash-alt"></i> Delete</button>
                    </td>
                `;
        studentList.appendChild(tr);
      });

      addButtonListeners();
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }

  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentData = {
      student_id: studentIdInput.value,
      name: nameInput.value,
      email: emailInput.value,
      address: addressInput.value,
      phone: phoneInput.value,
      date_of_birth: dobInput.value,
      // CRITICAL FIX: Gather the hidden _ids, not the string codes
      course_ids: Array.from(courseCodesSelect.selectedOptions).map(
        (option) => option.value,
      ),
    };

    try {
      if (isEditing) {
        const response = await fetch(
          `http://localhost:5001/api/students/${originalStudentId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(studentData),
          },
        );

        if (response.ok) {
          showToast("Student updated successfully!", "success");
          resetForm();
          fetchStudents();
        }
      } else {
        const response = await fetch("http://localhost:5001/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(studentData),
        });

        if (response.ok) {
          showToast("Student added successfully!", "success");
          resetForm();
          fetchStudents();
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  });

  function addButtonListeners() {
    document.querySelectorAll(".btn-edit").forEach((button) => {
      button.onclick = () => preFillForm(button.dataset.id);
    });
    document.querySelectorAll(".btn-delete").forEach((button) => {
      button.onclick = () => deleteStudent(button.dataset.id);
    });
  }

  async function preFillForm(id) {
    try {
      const response = await fetch(`http://localhost:5001/api/students/${id}`);
      const student = await response.json();

      isEditing = true;
      originalStudentId = student.student_id;

      document.querySelector("#add-student-form h2").textContent =
        "Edit Student";
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
      submitBtn.className = "btn btn-edit-submit";
      cancelBtn.classList.remove("hidden");

      studentIdOriginalInput.value = student.student_id;
      studentIdInput.value = student.student_id;
      nameInput.value = student.name;
      emailInput.value = student.email;
      addressInput.value = student.address || "";
      phoneInput.value = student.phone || "";
      dobPicker.setDate(student.date_of_birth || "");

      // Unselect all first
      Array.from(courseCodesSelect.options).forEach(
        (opt) => (opt.selected = false),
      );

      // CRITICAL FIX: Pre-select based on the _id mapping
      if (student.courses && Array.isArray(student.courses)) {
        const enrolledIds = student.courses.map((c) => c._id);
        Array.from(courseCodesSelect.options).forEach((option) => {
          if (enrolledIds.includes(option.value)) {
            option.selected = true;
          }
        });
      }

      document
        .getElementById("add-student-form")
        .scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error pre-filling form:", error);
    }
  }

  function resetForm() {
    studentForm.reset();
    isEditing = false;
    originalStudentId = "";

    document.querySelector("#add-student-form h2").textContent =
      "Add New Student";
    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Add Student';
    submitBtn.className = "btn btn-add";
    cancelBtn.classList.add("hidden");
  }

  cancelBtn.addEventListener("click", resetForm);

  async function deleteStudent(id) {
    if (!confirm(`Are you sure you want to delete student ID ${id}?`)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5001/api/students/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        showToast("Student deleted.", "success");
        fetchStudents();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  }
});
