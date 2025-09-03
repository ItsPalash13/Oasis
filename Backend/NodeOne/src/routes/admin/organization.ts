import express from 'express';
import { Organization } from '../../models/Organization/Organization';
import { Batch } from '../../models/Organization/Batch';
import { UserProfile } from '../../models/UserProfile';
import authMiddleware from '../../middleware/authMiddleware';
import { requireAdmin } from '../../middleware/rolesMiddleware';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(requireAdmin);

// Organization routes
router.get('/', async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 });
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organizations', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organization', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const existingOrg = await Organization.findOne({ name });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization with this name already exists' });
    }

    const organization = new Organization({ name, description });
    await organization.save();
    
    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ message: 'Error creating organization', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }

    const existingOrg = await Organization.findOne({ name, _id: { $ne: req.params.id } });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization with this name already exists' });
    }

    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    res.status(500).json({ message: 'Error updating organization', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // Check if organization has batches
    const batches = await Batch.find({ orgId: req.params.id });
    if (batches.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete organization with existing batches. Delete batches first.' 
      });
    }

    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting organization', error: error.message });
  }
});

// Batch routes
router.get('/:orgId/batches', async (req, res) => {
  try {
    const batches = await Batch.find({ orgId: req.params.orgId })
      .populate('orgId', 'name')
      .sort({ createdAt: -1 });
    
    // Manually populate user data since userIds are strings, not ObjectIds
    const populatedBatches = await Promise.all(
      batches.map(async (batch) => {
        if (batch.userIds && batch.userIds.length > 0) {
          const users = await UserProfile.find({ 
            userId: { $in: batch.userIds } 
          }).select('userId username email fullName');
          
          // Create a map for quick lookup
          const userMap: { [key: string]: any } = {};
          users.forEach(user => {
            userMap[user.userId] = user;
          });
          
          // Replace userIds with user objects
          const populatedUserIds = batch.userIds.map(userId => userMap[userId] || { userId });
          
          return {
            ...batch.toObject(),
            userIds: populatedUserIds
          };
        }
        return batch;
      })
    );
    
    res.json(populatedBatches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batches', error: error.message });
  }
});

router.get('/batch/:id', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('orgId', 'name');
    
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Manually populate user data
    if (batch.userIds && batch.userIds.length > 0) {
      const users = await UserProfile.find({ 
        userId: { $in: batch.userIds } 
      }).select('userId username email fullName');
      
      const userMap: { [key: string]: any } = {};
      users.forEach(user => {
        userMap[user.userId] = user;
      });
      
      const populatedUserIds = batch.userIds.map(userId => userMap[userId] || { userId });
      
      const populatedBatch = {
        ...batch.toObject(),
        userIds: populatedUserIds
      };
      
      res.json(populatedBatch);
    } else {
      res.json(batch);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batch', error: error.message });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const { name, description, orgId, userIds } = req.body;
    
    if (!name || !description || !orgId) {
      return res.status(400).json({ message: 'Name, description, and orgId are required' });
    }

    // Verify organization exists
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }

    const batch = new Batch({ 
      name, 
      description, 
      orgId, 
      userIds: userIds || [] 
    });
    await batch.save();
    
    // Manually populate user data if userIds exist
    if (batch.userIds && batch.userIds.length > 0) {
      const users = await UserProfile.find({ 
        userId: { $in: batch.userIds } 
      }).select('userId username email fullName');
      
      const userMap: { [key: string]: any } = {};
      users.forEach(user => {
        userMap[user.userId] = user;
      });
      
      const populatedUserIds = batch.userIds.map(userId => userMap[userId] || { userId });
      
      const populatedBatch = {
        ...batch.toObject(),
        userIds: populatedUserIds
      };
      
      res.status(201).json(populatedBatch);
    } else {
      const populatedBatch = await batch.populate('orgId', 'name');
      res.status(201).json(populatedBatch);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error creating batch', error: error.message });
  }
});

router.put('/batch/:id', async (req, res) => {
  try {
    const { name, description, orgId, userIds } = req.body;
    
    if (!name || !description || !orgId) {
      return res.status(400).json({ message: 'Name, description, and orgId are required' });
    }

    // Verify organization exists
    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(400).json({ message: 'Organization not found' });
    }

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { name, description, orgId, userIds: userIds || [] },
      { new: true, runValidators: true }
    ).populate('orgId', 'name');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Manually populate user data if userIds exist
    if (batch.userIds && batch.userIds.length > 0) {
      const users = await UserProfile.find({ 
        userId: { $in: batch.userIds } 
      }).select('userId username email fullName');
      
      const userMap: { [key: string]: any } = {};
      users.forEach(user => {
        userMap[user.userId] = user;
      });
      
      const populatedUserIds = batch.userIds.map(userId => userMap[userId] || { userId });
      
      const populatedBatch = {
        ...batch.toObject(),
        userIds: populatedUserIds
      };
      
      res.json(populatedBatch);
    } else {
      res.json(batch);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating batch', error: error.message });
  }
});

router.delete('/batch/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error: error.message });
  }
});

export default router;
