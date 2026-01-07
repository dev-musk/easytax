import express from 'express';
const router = express.Router();
import auth from '../middleware/auth.js';
import Invoice from '../models/Invoice.js';

// Update template settings for an invoice
router.patch('/:id/template-settings', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fontFamily, headerStyle, borderStyle, themeColor, textAlignment } = req.body;

    // Validate invoice ownership
    const invoice = await Invoice.findOne({
      _id: id,
      organization: req.user.organizationId,
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Update template settings
    invoice.templateSettings = {
      fontFamily: fontFamily || invoice.templateSettings?.fontFamily || 'Roboto',
      headerStyle: headerStyle || invoice.templateSettings?.headerStyle || 'BOXED',
      borderStyle: borderStyle || invoice.templateSettings?.borderStyle || 'PARTIAL',
      themeColor: themeColor || invoice.templateSettings?.themeColor || 'BLUE',
      textAlignment: textAlignment || invoice.templateSettings?.textAlignment || 'LEFT',
    };

    await invoice.save();

    res.json({
      message: 'Template settings updated successfully',
      templateSettings: invoice.templateSettings,
    });
  } catch (error) {
    console.error('Update template settings error:', error);
    res.status(500).json({ error: 'Failed to update template settings' });
  }
});

export default router;