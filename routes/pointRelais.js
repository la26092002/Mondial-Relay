const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
require('dotenv').config();

function generateSecurityHash(params) {
  const {
    Enseigne, Pays, NumPointRelais = '', CP = '', Latitude = '',
    Longitude = '', Taille = '', Poids = '', Action = '',
    DelaiEnvoi = '', RayonRecherche = '', NombreResultats = '', PrivateKey
  } = params;

  const strToHash = `${Enseigne}${Pays}${NumPointRelais}${CP}${Latitude}${Longitude}${Taille}${Poids}${Action}${DelaiEnvoi}${RayonRecherche}${NombreResultats}${PrivateKey}`;
  return crypto.createHash('md5').update(strToHash).digest('hex').toUpperCase();
}

function formatHoraire(horaireArray) {
  if (!horaireArray?.string || !Array.isArray(horaireArray.string)) return [];
  const [h1, h2] = horaireArray.string;
  return h1 && h2 ? [`${h1.slice(0, 2)}:${h1.slice(2)}`, `${h2.slice(0, 2)}:${h2.slice(2)}`] : [];
}

function cleanPointRelais(data) {
  return data.map((point) => ({
    id: point.Num,
    nom: point.LgAdr1,
    adresse: `${point.LgAdr3}, ${point.CP} ${point.Ville}, ${point.Pays}`,
    latitude: point.Latitude,
    longitude: point.Longitude,
    photo: point.URL_Photo,
    plan: point.URL_Plan,
    horaires: {
      lundi: formatHoraire(point.Horaires_Lundi),
      mardi: formatHoraire(point.Horaires_Mardi),
      mercredi: formatHoraire(point.Horaires_Mercredi),
      jeudi: formatHoraire(point.Horaires_Jeudi),
      vendredi: formatHoraire(point.Horaires_Vendredi),
      samedi: formatHoraire(point.Horaires_Samedi),
      dimanche: formatHoraire(point.Horaires_Dimanche),
    }
  }));
}

router.post('/relais', async (req, res) => {
  const {
    pays,
    cp,
    action = '24R',
    rayon = '50',
    nombre = '10'
  } = req.body;

  const enseigne = "CC23ISKB";
  const privateKey = "XFSjR3ZV";

  const security = generateSecurityHash({
    Enseigne: enseigne,
    Pays: pays,
    CP: cp,
    Action: action,
    RayonRecherche: rayon,
    NombreResultats: nombre,
    PrivateKey: privateKey
  });

  const soapBody = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://www.mondialrelay.fr/webservice/">
      <soapenv:Header/>
      <soapenv:Body>
        <ws:WSI4_PointRelais_Recherche>
          <ws:Enseigne>${enseigne}</ws:Enseigne>
          <ws:Pays>${pays}</ws:Pays>
          <ws:CP>${cp}</ws:CP>
          <ws:Action>${action}</ws:Action>
          <ws:RayonRecherche>${rayon}</ws:RayonRecherche>
          <ws:NombreResultats>${nombre}</ws:NombreResultats>
          <ws:Security>${security}</ws:Security>
        </ws:WSI4_PointRelais_Recherche>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const { data } = await axios.post('https://api.mondialrelay.com/Web_Services.asmx', soapBody, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche'
      }
    });

    xml2js.parseString(data, { explicitArray: false }, (err, resultSOAP) => {
      if (err) return res.status(500).json({ error: 'Erreur de parsing XML' });

      const result = resultSOAP['soap:Envelope']['soap:Body']['WSI4_PointRelais_RechercheResponse']['WSI4_PointRelais_RechercheResult'];

      const points = result.PointsRelais?.PointRelais_Details || [];
      const list = Array.isArray(points) ? points : [points];
      res.json(cleanPointRelais(list));
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Erreur API Mondial Relay' });
  }
});

module.exports = router;