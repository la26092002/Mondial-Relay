const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
require('dotenv').config();
const pointRelaisRoutes = require('./routes/pointRelais');
const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const relaisRoute = require('./routes/pointRelais');
app.use('/api', relaisRoute);




const apiUrl = 'https://connect-api-sandbox.mondialrelay.com/api/shipment';

const context = {
  Login: process.env.MR_LOGIN,
  Password: process.env.MR_PASSWORD,
  CustomerId: process.env.MR_CUSTOMER_ID,
  Culture: process.env.MR_CULTURE,
  VersionAPI: process.env.MR_API_VERSION,
};


const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<ShipmentCreationRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                         xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                         xmlns="http://www.example.org/Request">
  <Context>
    <Login>${context.Login}</Login>
    <Password>${context.Password}</Password>
    <CustomerId>${context.CustomerId}</CustomerId>
    <Culture>${context.Culture}</Culture>
    <VersionAPI>${context.VersionAPI}</VersionAPI>
  </Context>
  <OutputOptions>
    <OutputFormat>10x15</OutputFormat>
    <OutputType>PdfUrl</OutputType>
  </OutputOptions>
  <ShipmentsList>
    <Shipment>
      <OrderNo>CMD123456</OrderNo>
      <CustomerNo>CUS1234</CustomerNo>
      <ParcelCount>1</ParcelCount>
      
      <!-- Utilisation d’un point relais valide à Paris 10ème -->
      <DeliveryMode Mode="24R" Location="FR-31845"/>
      <CollectionMode Mode="CCC" Location=""/>
      
      <Parcels>
        <Parcel>
          <Content>Livres</Content>
          <Weight Value="5000" Unit="gr"/>
          <Length Value="31" Unit="cm"/>
          <Width Value="41" Unit="cm"/>
          <Depth Value="10" Unit="cm"/>
        </Parcel>
      </Parcels>
      
      <DeliveryInstruction>Livrer au fond à droite</DeliveryInstruction>
      
      <Sender>
        <Address>
          <Title>Mr</Title>
          <Firstname>Jean</Firstname>
          <Lastname>Dupont</Lastname>
          <Streetname>10 Avenue des Champs-Élysées</Streetname>
          <HouseNo>10</HouseNo>
          <CountryCode>FR</CountryCode>
          <PostCode>59000</PostCode>
          <City>Lille</City>
          <AddressAdd1/>
          <AddressAdd2/>
          <AddressAdd3/>
          <PhoneNo>0601020304</PhoneNo>
          <MobileNo>0601020304</MobileNo>
          <Email>expediteur@test.com</Email>
        </Address>
      </Sender>
      
      <Recipient>
        <Address>
          <Title>Mr</Title>
          <Firstname>Jean</Firstname>
          <Lastname>Durand</Lastname>
          <Streetname>1 Rue de la Paix</Streetname>
          <HouseNo>1</HouseNo>
          <CountryCode>FR</CountryCode>
          <PostCode>75010</PostCode>
          <City>Paris</City>
          <AddressAdd1/>
          <AddressAdd2/>
          <AddressAdd3/>
          <PhoneNo>0601020304</PhoneNo>
          <MobileNo/>
          <Email>client@test.com</Email>
        </Address>
      </Recipient>
      
    </Shipment>
  </ShipmentsList>
</ShipmentCreationRequest>
`;


app.post('/test-shipment', async (req, res) => {
  try {
    const response = await axios.post(apiUrl, xmlRequest, {
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
    console.error('Erreur lors de la requête à l’API Mondial Relay :', error.message);
    res.status(500).send('Erreur lors de l’appel à l’API');
  }
});

app.listen(PORT, () => {
  console.log(`Serveur backend en cours d’exécution sur http://localhost:${PORT}`);
});
