import express from 'express';
import { Organization } from '../../models/Organization/Organization';
import { Batch } from '../../models/Organization/Batch';
import { UserProfile } from '../../models/UserProfile';
import authMiddleware from '../../middleware/authMiddleware';
import { requireAdmin } from '../../middleware/rolesMiddleware';
import { Response } from 'express';
import { Request } from 'express';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(requireAdmin);

// Organization routes
router.get('/', async (req: Request, res: Response) => {
 console.log('Fetching organizations', req.body);
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 });
    return res.json(organizations);
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching organizations', error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    return res.json(organization);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching organization', error: error.message });
  }
});

// GET users by organization
router.get('/:id/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search } = req.query;
    
    // Verify organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    let filter: any = { organizationId: id };
    
    if (search && typeof search === 'string') {
      // Add search filter for username, email, or fullName
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      UserProfile.find(filter)
        .select('userId username email fullName role createdAt')
        .sort({ createdAt: -1 }),
      UserProfile.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: users,
      total,
      organization: {
        _id: organization._id,
        name: organization.name,
        description: organization.description
      }
    });
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Error fetching users by organization', 
      error: error.message 
    });
  }
});

// GET users by organization for batch assignment (with search)
router.get('/:id/users/search', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q } = req.query; // search query
    
    // Verify organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    let filter: any = { organizationId: id };
    
    if (q && typeof q === 'string') {
      // Search by username, email, or fullName
      filter.$or = [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await UserProfile.find(filter)
      .select('userId username email fullName role')
      .sort({ username: 1 })
      .limit(20);

    return res.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    return res.status(500).json({ 
      message: 'Error searching users by organization', 
      error: error.message 
    });
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
    
    return res.status(201).json(organization);
  } catch (error) {
    return res.status(500).json({ message: 'Error creating organization', error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
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

    return res.json(organization);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating organization', error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
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

    return res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting organization', error: error.message });
  }
});

// Batch routes
router.get('/:orgId/batches', async (req: Request, res: Response) => {
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
          console.log('User map', userMap);
          
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
    
    return res.json(populatedBatches);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching batches', error: error.message });
  }
});

router.get('/batch/:id', async (req: Request, res: Response) => {
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
      
      return res.json(populatedBatch);
    } else {
      return res.json(batch);
    }   
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching batch', error: error.message });
  }
});

router.post('/batch', async (req: Request, res: Response) => {
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
      
      return res.status(201).json(populatedBatch);
    } else {
      const populatedBatch = await batch.populate('orgId', 'name');
      return res.status(201).json(populatedBatch);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error creating batch', error: error.message });
  }
});

router.put('/batch/:id', async (req: Request, res: Response) => {
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
      
      return res.json(populatedBatch);
    } else {
      return res.json(batch);
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error updating batch', error: error.message });
  }
});

router.delete('/batch/:id', async (req: Request, res: Response) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    return res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting batch', error: error.message });
  }
});

export default router;
