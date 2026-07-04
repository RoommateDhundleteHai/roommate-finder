# VibeSync 2026 🚀
Stop gambling on your roommate! VibeSync is a smart roommate matching engine built for college students. It matches students based on sleep schedules, study habits, dietary preferences, and 12 other compatibility factors.

## 🛠️ Tech Stack
* **Frontend:** React.js
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL with Prisma ORM
* **Matching Engine:** Cosine Similarity Algorithm

---

## 🏃‍♂️ How to Run VibeSync Locally

Follow these steps to set up the project on your machine.

### Step 1: Clone the Repository
```bash
git clone [https://github.com/RoommateDhundleteHai/roommate-finder.git](https://github.com/RoommateDhundleteHai/roommate-finder.git)
cd roommate-finder

Step 2 -> Backend folder mein jao aur saare packages install karo:
cd backend
npm install

Step 3 -> env on whatsapp

Step 4 -> Ab Prisma ko database se connect karke usme tables aur dummy test data daalna hai:
# Push schema to the database
npx prisma db push  

# Generate Prisma Client
npx prisma generate 

# Seed the database with test data (Super Admins, Questions, Test Students)
npx tsx prisma/seed.ts

Step 5 -> Start the Backend Server
npx tsx src/index.ts

Step 6 -> Ab ek naya terminal kholo (purane wale ko chalne do) aur frontend setup karo:
cd frontend
npm install
npm start