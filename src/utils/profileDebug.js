/**
 * Debug utility to inspect profile API responses
 * Use in console: window.debugProfile() 
 */
export const setupProfileDebug = () => {
  window.debugProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      console.log('🔍 Fetching profile from /profile endpoint...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      console.log('Status:', response.status);
      console.log('Raw Response:', text);

      try {
        const data = JSON.parse(text);
        console.log('Parsed Response:', data);
        console.log('Response Type:', typeof data);
        console.log('Response Keys:', Object.keys(data));
        
        // Show field values
        console.log('Field Values:');
        console.log('  firstname:', data.firstname);
        console.log('  lastname:', data.lastname);
        console.log('  username:', data.username);
        console.log('  email:', data.email);
        console.log('  avatar:', data.avatar);
        console.log('  rolename:', data.rolename);
        
        return data;
      } catch (e) {
        console.error('Failed to parse JSON:', e.message);
      }
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  console.log('✅ Profile debug helper loaded. Use window.debugProfile() to check API response.');
};

export const logProfileState = () => {
  console.log('📊 Profile State Debug:');
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('LocalStorage User:', user);
    console.log('  - fullName:', user.fullName);
    console.log('  - name:', user.name);
    console.log('  - firstname:', user.firstname);
    console.log('  - lastname:', user.lastname);
    console.log('  - username:', user.username);
    console.log('  - avatar:', user.avatar);
  } catch (e) {
    console.error('Error reading localStorage:', e);
  }
};
