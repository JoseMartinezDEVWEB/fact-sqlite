import bcrypt from 'bcryptjs';
import { BaseModel } from '../config/database.js';

class UserModel extends BaseModel {
  constructor() { super('users'); }

  async create(data) {
    if (data.password && !data.password.startsWith('$2')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return super.create(data);
  }

  async _insertOne(data) {
    if (data.password && !data.password.startsWith('$2')) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return super._insertOne(data);
  }

  async comparePassword(userId, candidatePassword) {
    const user = await super.findById(userId);
    const u = await user;
    if (!u) return false;
    return bcrypt.compare(candidatePassword, u.password);
  }
}

export const User = new UserModel();
