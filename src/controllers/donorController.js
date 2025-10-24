import Donor from "../models/donorModel.js";

export const getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.find();
    res.status(200).json(donors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching donors", error });
  }
};

export const getDonorById = async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: "Donor not found" });
    res.status(200).json(donor);
  } catch (error) {
    res.status(500).json({ message: "Error fetching donor", error });
  }
};
