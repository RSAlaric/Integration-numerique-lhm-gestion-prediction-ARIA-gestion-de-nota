require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const routes     = require('./routes/index');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(rateLimit({ windowMs:15*60*1000, max:500, message:{ success:false, message:'Trop de requêtes.' } }));
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (req, res) => res.json({
  status: 'OK', app: 'LHM Madagascar API (mode simulation)',
  timestamp: new Date().toISOString(),
  note: 'Base de données en mémoire — les données sont réinitialisées au redémarrage'
}));

app.use((req, res) => res.status(404).json({ success:false, message:'Route non trouvée' }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ success:false, message:'Erreur serveur' }); });

app.listen(PORT, () => {
  console.log(`\n🚀 LHM Madagascar API démarrée sur http://localhost:${PORT}`);
  console.log(`💾 Mode: Base de données EN MÉMOIRE (simulation)`);
  console.log(`⚠️  Les données sont réinitialisées à chaque redémarrage`);
  console.log(`\n📋 Comptes de démonstration :`);
  console.log(`   Admin:     admin@lhm-madagascar.org     / Admin@1234`);
  console.log(`   Direction: direction@lhm-madagascar.org / Direction@1234`);
  console.log(`   RH:        rh@lhm-madagascar.org        / RH@1234`);
  console.log(`   Stock:     stock@lhm-madagascar.org     / Stock@1234`);
  console.log(`   Volont.:   volontaires@lhm-madagascar.org / Vol@1234\n`);
});

module.exports = app;
