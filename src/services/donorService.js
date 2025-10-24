const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Donor = require('../models/donorModel');

class DonorService {
  /**
   * Import donors from CSV file
   */
  async importDonorsFromCSV(filePath) {
    return new Promise((resolve, reject) => {
      const donors = [];
      const errors = [];
      let lineNumber = 1;

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`CSV file not found at path: ${filePath}`));
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          lineNumber++;
          try {
            // Clean and transform CSV data
            const donor = {
              name: row.name?.trim() || '',
              age: parseInt(row.age) || 0,
              blood_group: row.blood_group?.trim().toUpperCase() || '',
              contact_number: row.contact_number?.trim() || '',
              email: row.email?.trim().toLowerCase() || '',
              address: row.address?.trim() || '',
              last_donation_date: row.last_donation_date 
                ? new Date(row.last_donation_date) 
                : null
            };

            // Basic validation
            if (!donor.name || !donor.email) {
              errors.push({
                line: lineNumber,
                data: row,
                error: 'Missing required fields (name or email)'
              });
            } else {
              donors.push(donor);
            }
          } catch (error) {
            errors.push({
              line: lineNumber,
              data: row,
              error: error.message
            });
          }
        })
        .on('end', async () => {
          try {
            console.log(`📄 CSV parsing completed. Found ${donors.length} donors.`);
            
            if (donors.length === 0) {
              return reject(new Error('No valid donor records found in CSV'));
            }

            // Insert donors with error handling for duplicates
            const results = {
              successful: [],
              failed: [],
              duplicates: []
            };

            for (const donorData of donors) {
              try {
                const donor = await Donor.create(donorData);
                results.successful.push(donor);
              } catch (error) {
                if (error.code === 11000) {
                  // Duplicate email
                  results.duplicates.push({
                    email: donorData.email,
                    error: 'Email already exists'
                  });
                } else {
                  results.failed.push({
                    data: donorData,
                    error: error.message
                  });
                }
              }
            }

            console.log(`✅ Successfully imported ${results.successful.length} donors`);
            console.log(`⚠️  ${results.duplicates.length} duplicates skipped`);
            console.log(`❌ ${results.failed.length} records failed validation`);

            resolve({
              total: donors.length,
              successful: results.successful.length,
              duplicates: results.duplicates.length,
              failed: results.failed.length,
              errors: [...errors, ...results.failed, ...results.duplicates]
            });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(new Error(`CSV reading error: ${error.message}`));
        });
    });
  }

  /**
   * Get all donors
   */
  async getAllDonors(filters = {}) {
    try {
      const query = {};

      // Apply filters
      if (filters.blood_group) {
        query.blood_group = filters.blood_group.toUpperCase();
      }

      if (filters.isEligible === 'true') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        query.$or = [
          { last_donation_date: null },
          { last_donation_date: { $lte: ninetyDaysAgo } }
        ];
      }

      const donors = await Donor.find(query)
        .sort({ createdAt: -1 })
        .select('-__v');

      return donors;
    } catch (error) {
      throw new Error(`Error fetching donors: ${error.message}`);
    }
  }

  /**
   * Get donor by ID
   */
  async getDonorById(donorId) {
    try {
      const donor = await Donor.findById(donorId).select('-__v');

      if (!donor) {
        throw new Error('Donor not found');
      }

      return donor;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new Error('Invalid donor ID format');
      }
      throw error;
    }
  }

  /**
   * Create a new donor
   */
  async createDonor(donorData) {
    try {
      const donor = await Donor.create(donorData);
      return donor;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Update donor
   */
  async updateDonor(donorId, updateData) {
    try {
      const donor = await Donor.findByIdAndUpdate(
        donorId,
        updateData,
        { new: true, runValidators: true }
      ).select('-__v');

      if (!donor) {
        throw new Error('Donor not found');
      }

      return donor;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new Error('Invalid donor ID format');
      }
      if (error.code === 11000) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Delete donor
   */
  async deleteDonor(donorId) {
    try {
      const donor = await Donor.findByIdAndDelete(donorId);

      if (!donor) {
        throw new Error('Donor not found');
      }

      return donor;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new Error('Invalid donor ID format');
      }
      throw error;
    }
  }

  /**
   * Get donors by blood group
   */
  async getDonorsByBloodGroup(bloodGroup) {
    try {
      const donors = await Donor.find({ 
        blood_group: bloodGroup.toUpperCase() 
      }).select('-__v');

      return donors;
    } catch (error) {
      throw new Error(`Error fetching donors by blood group: ${error.message}`);
    }
  }

  /**
   * Get donor statistics
   */
  async getDonorStatistics() {
    try {
      const stats = await Donor.aggregate([
        {
          $group: {
            _id: '$blood_group',
            count: { $sum: 1 },
            avgAge: { $avg: '$age' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      const total = await Donor.countDocuments();

      return {
        total,
        byBloodGroup: stats
      };
    } catch (error) {
      throw new Error(`Error fetching statistics: ${error.message}`);
    }
  }
}

module.exports = new DonorService();