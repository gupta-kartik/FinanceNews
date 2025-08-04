import pytest
import json
from app.models import User, UserPreference

class TestAuthRoutes:
    """Test authentication routes"""
    
    def test_register_success(self, client):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'password123'
        }
        
        response = client.post('/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert 'user_id' in response_data
        assert response_data['message'] == 'User registered successfully'
        
        # Verify user was created in database
        user = User.query.filter_by(username='newuser').first()
        assert user is not None
        assert user.email == 'newuser@example.com'
        
        # Verify preferences were created
        preferences = UserPreference.query.filter_by(user_id=user.id).first()
        assert preferences is not None
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields"""
        data = {
            'username': 'testuser'
            # Missing email and password
        }
        
        response = client.post('/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'error' in response_data
    
    def test_register_duplicate_username(self, client, sample_user):
        """Test registration with existing username"""
        data = {
            'username': 'testuser',  # Already exists
            'email': 'different@example.com',
            'password': 'password123'
        }
        
        response = client.post('/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'Username already exists' in response_data['error']
    
    def test_register_duplicate_email(self, client, sample_user):
        """Test registration with existing email"""
        data = {
            'username': 'differentuser',
            'email': 'test@example.com',  # Already exists
            'password': 'password123'
        }
        
        response = client.post('/auth/register',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'Email already exists' in response_data['error']
    
    def test_login_success(self, client, sample_user):
        """Test successful login"""
        data = {
            'username': 'testuser',
            'password': 'password123'
        }
        
        response = client.post('/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'access_token' in response_data
        assert 'user' in response_data
        assert response_data['user']['username'] == 'testuser'
    
    def test_login_invalid_credentials(self, client, sample_user):
        """Test login with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        
        response = client.post('/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert 'Invalid credentials' in response_data['error']
    
    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        data = {
            'username': 'testuser'
            # Missing password
        }
        
        response = client.post('/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'Username and password are required' in response_data['error']
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        
        response = client.post('/auth/login',
                             data=json.dumps(data),
                             content_type='application/json')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert 'Invalid credentials' in response_data['error']
    
    def test_logout_success(self, client, auth_headers):
        """Test successful logout"""
        response = client.post('/auth/logout', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Logout successful'
    
    def test_get_profile_success(self, client, auth_headers, sample_user):
        """Test getting user profile"""
        response = client.get('/auth/profile', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert 'user' in response_data
        assert response_data['user']['username'] == 'testuser'
        assert 'preferences' in response_data['user']
    
    def test_get_profile_without_auth(self, client):
        """Test getting profile without authentication"""
        response = client.get('/auth/profile')
        
        assert response.status_code == 401
    
    def test_update_preferences_success(self, client, auth_headers):
        """Test updating user preferences"""
        data = {
            'categories': 'business,technology',
            'stock_symbols': 'AAPL,GOOGL',
            'notification_enabled': False
        }
        
        response = client.put('/auth/preferences',
                            data=json.dumps(data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Preferences updated successfully'
    
    def test_update_preferences_without_auth(self, client):
        """Test updating preferences without authentication"""
        data = {
            'categories': 'business,technology'
        }
        
        response = client.put('/auth/preferences',
                            data=json.dumps(data),
                            content_type='application/json')
        
        assert response.status_code == 401