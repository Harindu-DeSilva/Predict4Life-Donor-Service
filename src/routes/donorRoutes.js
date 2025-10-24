import express from "express";
import { getAllDonors, getDonorById } from "../controllers/donorController.js";

const router = express.Router();

router.get("/", getAllDonors);
router.get("/:id", getDonorById);

export default router;
