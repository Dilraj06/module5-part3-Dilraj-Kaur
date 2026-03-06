const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const port = 3000;

const mongoUri = process.env.MONGO_URI || "mongodb://mongo:27017/bank_app";

async function getGroupedTransactions() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db("bank_app");
    const users = db.collection("users");

    // Get the most recently created/updated user document
    const user = await users.findOne({}, { sort: { _id: -1 } });

    if (!user || !user.transactions) {
      return [];
    }

    const grouped = {};

    user.transactions.forEach((t) => {
      const date = new Date(t.date);
      const month = date.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });

      if (!grouped[month]) {
        grouped[month] = {
          user: `${user.first_name} ${user.last_name}`,
          month,
          deposits: 0,
          withdrawals: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
        };
      }

      if (t.type === "deposit") {
        grouped[month].deposits += 1;
        grouped[month].totalDeposited += Number(t.amount);
      } else if (t.type === "withdrawal") {
        grouped[month].withdrawals += 1;
        grouped[month].totalWithdrawn += Number(t.amount);
      }
    });

    return Object.values(grouped);
  } finally {
    await client.close();
  }
}

app.get("/transactions", async (req, res) => {
  try {
    const result = await getGroupedTransactions();
    res.json(result);
  } catch (error) {
    console.error("Error reading transactions:", error);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

app.listen(port, () => {
  console.log(`Transactions service running on port ${port}`);
});