async function checkAPI() {
  try {
    console.log('Fetching building data from API...\n');
    
    const response = await fetch('http://localhost:5175/api/projects/9/buildings');
    const data = await response.json();
    
    console.log('=== API Response for /api/projects/9/buildings ===');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error fetching from API:', error.message);
  }
}

checkAPI();
