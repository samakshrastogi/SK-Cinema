import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Backend working 🚀" });
});

export default router;