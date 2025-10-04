# 🔌 Frontend-Backend API Integration Guide

## ✅ Integration Complete!

The frontend has been fully integrated with the backend API. All authentication and data flows are now connected.

---

## 📁 Files Created/Modified

### New Files Created

1. **`src/lib/api.ts`** - Complete API integration layer
   - All API endpoints
   - Type definitions
   - Request helpers
   - Token management

2. **`src/hooks/useAuth.ts`** - Authentication hook
   - Login/logout functionality
   - User state management
   - Role checking

3. **`src/components/ProtectedRoute.tsx`** - Route protection
   - Authentication guard
   - Redirect to login

4. **`.env`** - Environment configuration
   - API URL configuration

### Modified Files

1. **`src/pages/SignIn.tsx`** - Connected to login API
2. **`src/pages/SignUp.tsx`** - Connected to registration API
3. **`src/App.tsx`** - Added protected routes
4. **`vite.config.ts`** - Added API proxy

---

## 🔐 Authentication Flow

### Registration Flow
```typescript
// User fills signup form
SignUp Page → useAuth.register() → authApi.register()
  ↓
Backend /api/auth/register
  ↓
Returns: { user, token }
  ↓
Store token in localStorage
Store user in localStorage
  ↓
Navigate to /dashboard
```

### Login Flow
```typescript
// User fills login form
SignIn Page → useAuth.login() → authApi.login()
  ↓
Backend /api/auth/login
  ↓
Returns: { user, token }
  ↓
Store token in localStorage
Store user in localStorage
  ↓
Navigate to /dashboard
```

### Protected Route Flow
```typescript
User navigates to /dashboard
  ↓
ProtectedRoute checks authToken.get()
  ↓
If token exists → Render Dashboard
If no token → Navigate to /signin
```

---

## 📡 API Integration Layer

### Available APIs

#### Authentication (`authApi`)
```typescript
authApi.register(data)      // Register new user
authApi.login(email, password)  // Login user
authApi.logout()            // Logout user
authApi.getProfile()        // Get current user
authApi.updateProfile(data) // Update profile
authApi.changePassword()    // Change password
```

#### Users (`userApi`)
```typescript
userApi.getAll()           // Get all users
userApi.getById(id)        // Get user by ID
userApi.create(data)       // Create new user
userApi.update(id, data)   // Update user
userApi.delete(id)         // Delete user
userApi.getTeamMembers()   // Get team members
userApi.getManagers()      // Get managers list
```

#### Expenses (`expenseApi`)
```typescript
expenseApi.create(formData)        // Submit expense
expenseApi.getMyExpenses()         // Get my expenses
expenseApi.getPendingApprovals()   // Get pending approvals
expenseApi.getAll()                // Get all expenses
expenseApi.getById(id)             // Get expense by ID
expenseApi.update(id, data)        // Update expense
expenseApi.cancel(id)              // Cancel expense
expenseApi.getStats()              // Get statistics
```

#### Approvals (`approvalApi`)
```typescript
approvalApi.approveOrReject(id, action, comments)
approvalApi.getHistory(id)
approvalApi.override(id, action, comments)
approvalApi.getPendingCount()
approvalApi.bulkAction(ids, action, comments)
```

#### Company (`companyApi`)
```typescript
companyApi.get()                   // Get company details
companyApi.update(data)            // Update company
companyApi.getCategories()         // Get expense categories
companyApi.addCategory(data)       // Add category
companyApi.updateCategory(id, data)// Update category
companyApi.deleteCategory(id)      // Delete category
```

#### Currency (`currencyApi`)
```typescript
currencyApi.getCountries()         // Get countries list
currencyApi.getActive()            // Get active currencies
currencyApi.getRates(baseCurrency) // Get exchange rates
currencyApi.convert(amount, from, to) // Convert currency
```

#### OCR (`ocrApi`)
```typescript
ocrApi.extractText(file)           // Extract text from image
ocrApi.extractReceiptData(file)    // Extract receipt data
ocrApi.getStatus()                 // Get OCR status
```

---

## 🎯 Usage Examples

### Example 1: Login
```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { login } = useAuth();
  
  const handleLogin = async () => {
    const result = await login('user@example.com', 'password');
    if (result.success) {
      // User is logged in, navigate to dashboard
    }
  };
}
```

### Example 2: Fetch Expenses
```typescript
import { expenseApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

function ExpenseList() {
  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const response = await expenseApi.getMyExpenses();
      return response.data?.expenses || [];
    },
  });
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {data?.map(expense => (
        <div key={expense._id}>{expense.description}</div>
      ))}
    </div>
  );
}
```

### Example 3: Submit Expense
```typescript
import { expenseApi } from '@/lib/api';

function SubmitExpenseForm() {
  const handleSubmit = async (formData: FormData) => {
    try {
      const response = await expenseApi.create(formData);
      if (response.success) {
        // Expense submitted successfully
      }
    } catch (error) {
      // Handle error
    }
  };
}
```

### Example 4: Approve Expense
```typescript
import { approvalApi } from '@/lib/api';

function ApprovalButton({ expenseId }: { expenseId: string }) {
  const handleApprove = async () => {
    const response = await approvalApi.approveOrReject(
      expenseId,
      'approve',
      'Looks good!'
    );
    
    if (response.success) {
      // Expense approved
    }
  };
  
  return <button onClick={handleApprove}>Approve</button>;
}
```

---

## 🔑 Token Management

### Automatic Token Handling
All API requests automatically include the JWT token in the Authorization header:

```typescript
Authorization: Bearer <token>
```

### Token Storage
- Stored in `localStorage` as `authToken`
- Automatically retrieved for each request
- Removed on logout

### User Data Storage
- Current user stored in `localStorage` as `currentUser`
- Accessible via `currentUser.get()`
- Updated on login/register
- Removed on logout

---

## 🛡️ Type Safety

All API responses are fully typed:

```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'employee';
  company: Company;
  // ... more fields
}

interface Expense {
  _id: string;
  amount: number;
  currency: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  // ... more fields
}
```

---

## 🔄 Next Steps for Each Page

### Dashboard
```typescript
// Fetch expense statistics
const stats = await expenseApi.getStats();

// Fetch pending approvals count
const count = await approvalApi.getPendingCount();

// Fetch recent expenses
const expenses = await expenseApi.getMyExpenses();
```

### Submit Expense
```typescript
// Get expense categories
const categories = await companyApi.getCategories();

// Submit expense with receipt
const formData = new FormData();
formData.append('amount', '100');
formData.append('currency', 'USD');
formData.append('category', 'Meals & Entertainment');
formData.append('description', 'Business lunch');
formData.append('expenseDate', '2025-10-04');
formData.append('tags', JSON.stringify(['client', 'lunch']));
formData.append('receipt', fileInput.files[0]);

const response = await expenseApi.create(formData);
```

### Employee Expenses
```typescript
// Fetch user's expenses
const expenses = await expenseApi.getMyExpenses();

// Cancel an expense
await expenseApi.cancel(expenseId);
```

### Manager Approvals
```typescript
// Fetch pending approvals
const pending = await expenseApi.getPendingApprovals();

// Approve expense
await approvalApi.approveOrReject(expenseId, 'approve', 'Approved');

// Reject expense
await approvalApi.approveOrReject(expenseId, 'reject', 'Need more details');

// Bulk approve
await approvalApi.bulkAction([id1, id2], 'approve', 'Batch approved');
```

### Approval Rules (Admin)
```typescript
// Get company details
const company = await companyApi.get();

// Get categories
const categories = await companyApi.getCategories();

// Add new category
await companyApi.addCategory({
  name: 'Training',
  description: 'Training and education expenses'
});
```

---

## 🧪 Testing the Integration

### 1. Test Authentication
```bash
# Start both servers
npm run start:all

# Open browser
http://localhost:8080

# Sign up with new account
# Login with credentials
# Verify redirect to dashboard
```

### 2. Test API Calls
Open browser console and check Network tab:
- All requests should go to `/api/*`
- Vite proxy forwards to `http://localhost:3000/api/*`
- Responses should be successful (200, 201)

### 3. Test Protected Routes
- Try accessing `/dashboard` without login → Should redirect to `/signin`
- Login → Should access `/dashboard`
- Logout → Should redirect to `/signin`

---

## 🐛 Troubleshooting

### Issue: CORS Errors
**Solution**: Proxy is configured in `vite.config.ts`. Ensure backend CORS is enabled.

### Issue: 401 Unauthorized
**Solution**: Check if token is stored in localStorage. Try logging in again.

### Issue: Network Error
**Solution**: Ensure backend is running on port 3000.

### Issue: Type Errors
**Solution**: Check `src/lib/api.ts` for correct type definitions.

---

## 📝 Environment Variables

### Frontend `.env`
```env
VITE_API_URL=http://localhost:3000/api
```

### Backend `.env`
```env
PORT=3000
MONGODB_URI=<your-mongodb-uri>
JWT_SECRET=<your-secret>
```

---

## ✨ Summary

✅ **Authentication** - Login/Register/Logout fully integrated  
✅ **Protected Routes** - All authenticated pages protected  
✅ **API Layer** - Complete API integration with types  
✅ **Token Management** - Automatic JWT handling  
✅ **Error Handling** - Toast notifications for errors  
✅ **Type Safety** - Full TypeScript support  

**Ready to use!** Start the servers and begin developing the remaining pages.

---

**Next**: Implement the remaining page integrations (Dashboard, SubmitExpense, etc.)
