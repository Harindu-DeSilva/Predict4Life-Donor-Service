import mongoose from "mongoose";

const donorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  blood_group: { type: String, required: true },
  contact_number: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  last_donation_date: { type: Date, default: null },
  latitude: { type: Number, required: true },  
  longitude: { type: Number, required: true },  
});

const Donor = mongoose.model("Donor", donorSchema);
export default Donor;
