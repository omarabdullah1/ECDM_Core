const axios = require('axios');
axios.get('http://localhost:5001/api/hr/employees') // first get a valid id
  .then(res => {
      const id = res.data.data[0]._id;
      return axios.get(`http://localhost:5001/api/hr/users/${id}/profile`);
  })
  .then(res => console.log('SUCCESS'))
  .catch(err => {
      console.error('ERROR RESPONSE:', err.response ? err.response.data : err.message);
  });
