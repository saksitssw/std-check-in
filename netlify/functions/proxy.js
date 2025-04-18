exports.handler = async (event) => {
  const { action, data } = JSON.parse(event.body);
  const gasUrl = `https://script.google.com/macros/s/AKfycb.../exec`;
  
  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify({ action, ...data })
  });
  
  return {
    statusCode: 200,
    body: JSON.stringify(await response.json())
  };
};
