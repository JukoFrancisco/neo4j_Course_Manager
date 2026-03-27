# Course Manager

Course Manager is a modern, full-stack university management system designed to seamlessly handle the complex relationships between students, faculty, and courses. It was built to demonstrate the power of Graph Databases in mapping real-world educational networks.

## Features

* **Student Management:** Full CRUD (Create, Read, Update, Delete) capabilities with age-restricted date-of-birth validation.
* **Faculty Directory:** Track faculty members, their contact information, and their assigned teaching departments.
* **Course Administration:** Manage course catalogs, credit hours, and detailed descriptions.
* **Graph Relationships:** Utilizes Neo4j to effortlessly link multiple students to courses (`ENROLLED_IN`) and faculty to courses (`TEACHES`).
* **Premium UI/UX:** Features a custom color palette, responsive CSS grids, dynamic wrapping data pills, and animated toast notifications.

## 🛠️ Technology Stack

**Frontend:**
* HTML5 & CSS3 (Custom variables, Flexbox, Grid)
* Vanilla JavaScript (ES6+)
* [Flatpickr](https://flatpickr.js.org/) (Date formatting)
* FontAwesome (Iconography)

**Backend:**
* [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) (RESTful API)
* UUID (Unique ID generation)

**Database:**
* [Neo4j](https://neo4j.com/) (Graph Database)
* `neo4j-driver` (Cypher query execution and transaction management)

## 📋 Prerequisites

To run this project locally, you will need:
* Node.js installed on your machine.
* A running instance of Neo4j (either Neo4j Desktop locally or Neo4j AuraDB in the cloud).

## ⚙️ Setup & Installation

**1. Clone the repository**
```bash
git clone [https://github.com/yourusername/academia-hub-final.git](https://github.com/yourusername/academia-hub-final.git)
cd academia-hub-final
