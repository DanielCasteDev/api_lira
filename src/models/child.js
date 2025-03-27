const mongoose = require('mongoose');

const gameProgressSchema = new mongoose.Schema({
  gameName: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  levelsCompleted: {
    type: Number,
    default: 0
  },
  highestDifficulty: {
    type: String,
    enum: ['fácil', 'medio', 'difícil']
  },
  lastPlayed: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const childSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  apellido: {
    type: String,
    required: true,
    trim: true,
  },
  fechaNacimiento: {
    type: Date,
    required: true,
  },
  genero: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  contraseña: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parent',
    required: true,
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  gameProgress: [gameProgressSchema],
  totalPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.contraseña;
      return ret;
    }
  }
});

// Índice para búsquedas por parentId
childSchema.index({ parentId: 1 });

const Child = mongoose.model('Child', childSchema);

module.exports = Child;