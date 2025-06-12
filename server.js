const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const context = {
  Login: process.env.MR_LOGIN,
  Password: process.env.MR_PASSWORD,
  CustomerId: process.env.MR_CUSTOMER_ID,
  Culture: process.env.MR_CULTURE,
  VersionAPI: process.env.MR_API_VERSION,
};

function buildDynamicXml(body) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'utf-8' },
    renderOpts: { pretty: true },
    headless: true
  });

  const xmlObject = {
    ShipmentCreationRequest: {
      $: {
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
        'xmlns': 'http://www.example.org/Request'
      },
      Context: {
        Login: context.Login,
        Password: context.Password,
        CustomerId: context.CustomerId,
        Culture: context.Culture,
        VersionAPI: context.VersionAPI
      },
      OutputOptions: {
        OutputFormat: '10x15',
        OutputType: 'PdfUrl'
      },
      ShipmentsList: {
        Shipment: {
          OrderNo: body.orderNo,
          CustomerNo: body.customerNo,
          ParcelCount: body.parcelCount || 1,
          DeliveryMode: {
            $: {
              Mode: body.deliveryMode,
              Location: body.deliveryLocation // must be a valid code like FR-66974
            }
          },
          CollectionMode: {
            $: {
              Mode: 'CCC',
              Location: ''
            }
          },
          Parcels: {
            Parcel: {
              Content: 'Livres',
              Weight: { $: { Value: '5000', Unit: 'gr' } },
              Length: { $: { Value: '31', Unit: 'cm' } },
              Width: { $: { Value: '41', Unit: 'cm' } },
              Depth: { $: { Value: '10', Unit: 'cm' } }
            }
          },
          DeliveryInstruction: 'Livrer au fond a droite',
          Sender: {
            Address: {
              Title: 'Mr',
              Firstname: body.sender.firstname,
              Lastname: body.sender.lastname,
              Streetname: body.sender.street,
              HouseNo: body.sender.houseNo,
              CountryCode: body.sender.country,
              PostCode: body.sender.postcode,
              City: body.sender.city,
              AddressAdd1: '',
              AddressAdd2: '',
              AddressAdd3: '',
              PhoneNo: body.sender.phone,
              MobileNo: body.sender.mobile || '',
              Email: body.sender.email
            }
          },
          Recipient: {
            Address: {
              Title: 'Mr',
              Firstname: body.recipient.firstname,
              Lastname: body.recipient.lastname,
              Streetname: body.recipient.street,
              HouseNo: body.recipient.houseNo,
              CountryCode: body.recipient.country,
              PostCode: body.recipient.postcode,
              City: body.recipient.city,
              AddressAdd1: '',
              AddressAdd2: '',
              AddressAdd3: '',
              PhoneNo: body.recipient.phone,
              MobileNo: body.recipient.mobile || '',
              Email: body.recipient.email
            }
          }
        }
      }
    }
  };

  return builder.buildObject(xmlObject);
}

app.post('/test-shipment', async (req, res) => {
  try {
    const xmlRequest = buildDynamicXml(req.body);

    const response = await axios.post(process.env.MR_API_URL, xmlRequest, {
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'application/xml'
      }
    });

    xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
      if (err) {
        return res.status(500).send('Erreur de parsing XML');
      }
      res.json(result);
    });
  } catch (error) {
    console.error('Erreur lors de l’appel à l’API Mondial Relay :', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    res.status(500).send('Erreur lors de l’appel à l’API');
  }
});

app.listen(PORT, () => {
  console.log(`Serveur backend en cours sur http://localhost:${PORT}`);
});
