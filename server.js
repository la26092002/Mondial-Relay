const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
const md5 = require('md5');
require('dotenv').config();
const cors = require('cors');
const pointRelais = require('./routes/pointRelais');

const app = express();
const PORT = 7777;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', pointRelais);

const MR_SOAP_ENDPOINT = 'https://www.mondialrelay.fr/WebService/Web_Services.asmx?op=WSI2_CreationEtiquette';
const ENSEIGNE = process.env.MR_ENSEIGNE;        // ex: CC23ISKB
const PRIVATE_KEY = process.env.MR_KEY_PRIVEE;   // ex: XFSjR3ZV

// Utilitaire : génère le XML SOAP pour Mondial Relay
function generateSoapXml(fields) {
  const keysInOrder = [
    'Enseigne', 'ModeCol', 'ModeLiv', 'NDossier', 'NClient',
    'Expe_Langage', 'Expe_Ad1', 'Expe_Ad2', 'Expe_Ad3', 'Expe_Ad4',
    'Expe_Ville', 'Expe_CP', 'Expe_Pays', 'Expe_Tel1', 'Expe_Tel2', 'Expe_Mail',
    'Dest_Langage', 'Dest_Ad1', 'Dest_Ad2', 'Dest_Ad3', 'Dest_Ad4',
    'Dest_Ville', 'Dest_CP', 'Dest_Pays', 'Dest_Tel1', 'Dest_Tel2', 'Dest_Mail',
    'Poids', 'Longueur', 'Taille', 'NbColis', 'CRT_Valeur', 'CRT_Devise',
    'EXP_Valeur', 'EXP_Devise',
    'COL_Rel_Pays', 'COL_Rel', 'LIV_Rel_Pays', 'LIV_Rel',
    'TAvisage', 'TReprise', 'Montage', 'TRDV', 'Assurance', 'Instructions'
  ];

  let securityStr = '';
  let bodyXml = '';
  for (const key of keysInOrder) {
    const value = fields[key] || '';
    securityStr += value;
    bodyXml += `<${key}>${value}</${key}>`;
  }

  const securityHash = md5(securityStr + PRIVATE_KEY).toUpperCase();
  bodyXml += `<Security>${securityHash}</Security>`;

  const xml = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soapenv:Body>
    <WSI2_CreationEtiquette xmlns="http://www.mondialrelay.fr/webservice/">
      ${bodyXml}
    </WSI2_CreationEtiquette>
  </soapenv:Body>
</soapenv:Envelope>
  `.trim();

  return xml;
}

app.post('/generate-label', async (req, res) => {
  try {
    const fields = req.body;
    fields.Enseigne = ENSEIGNE; // impose l’enseigne du compte

    const soapXml = generateSoapXml(fields);

    const response = await axios.post(MR_SOAP_ENDPOINT, soapXml, {
      headers: {
        'Content-Type': 'text/xml;charset=utf-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI2_CreationEtiquette'
      }
    });

    xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
      if (err) return res.status(500).json({ error: 'Erreur de parsing XML' });

      const resData =
        result['soap:Envelope']?.['soap:Body']?.['WSI2_CreationEtiquetteResponse']?.['WSI2_CreationEtiquetteResult'];

      if (!resData || resData.STAT !== '0') {
        const errCode = resData?.STAT || '999';
        return res.status(400).json({ error: `Erreur Mondial Relay STAT=${errCode}`, detail: resData });
      }

      res.json({
        ExpeditionNum: resData.ExpeditionNum,
        URL_Etiquette: 'https://www.mondialrelay.fr' + resData.URL_Etiquette,
        format: '10x15'
      });
    });
  } catch (error) {
    console.error(error.message);
    if (error.response?.data) {
      console.error(error.response.data);
    }
    res.status(500).send('Erreur lors de l’appel SOAP Mondial Relay');
  }
});

app.listen(PORT, () => {
  console.log(`Serveur SOAP Mondial Relay en écoute sur http://localhost:${PORT}`);
});
