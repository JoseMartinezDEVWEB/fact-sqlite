import { License } from '../models/License.js';
import { getDb } from '../config/database.js';

export const getLicenses = async (req, res) => {
  try {
    const licenses = await License.find({});
    res.json({ data: await licenses });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const listLicenses = getLicenses;

export const checkLicense = async (req, res) => {
  try {
    const { key } = req.body;
    const q = await License.findOne({ keyValue: key });
    const license = await q;
    if (!license) return res.status(404).json({ valid: false, message: 'Licencia no encontrada' });
    if (license.status !== 'active') return res.status(403).json({ valid: false, message: 'Licencia inactiva' });
    res.json({ valid: true, license });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const validateLicense = checkLicense;

export const createLicense = async (req, res) => {
  try {
    const license = await License.create(req.body);
    res.status(201).json(license);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const activateLicense = async (req, res) => {
  try {
    const updated = await License.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    const u = await updated;
    if (!u) return res.status(404).json({ message: 'Licencia no encontrada' });
    res.json({ message: 'Licencia activada', license: u });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const renewLicense = async (req, res) => {
  try {
    const { expiresAt } = req.body;
    const updated = await License.findByIdAndUpdate(req.params.id, { status: 'active', expiresAt }, { new: true });
    const u = await updated;
    res.json({ message: 'Licencia renovada', license: u });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const blockLicense = async (req, res) => {
  try {
    await License.findByIdAndUpdate(req.params.id, { status: 'blocked' });
    res.json({ message: 'Licencia bloqueada' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const checkLicenseStatuses = async (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`UPDATE licenses SET status = 'expired' WHERE expires_at < ? AND status = 'active'`).run(now);
    res.json({ message: 'Estados de licencias actualizados' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getLicenseHistory = async (req, res) => {
  res.json({ data: [] });
};
