import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, DollarSign, FileText, Users, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard = () => {
  const { user, isAdmin, isManager } = useAuth();
  const [period, setPeriod] = useState('all'); // Default to 'all' to show all data

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['dashboard-analytics', period],
    queryFn: async () => {
      const response = await analyticsApi.getDashboard(period);
      console.log('Analytics Response:', response);
      console.log('Analytics Data:', response.data);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading analytics. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              {analytics?.period?.month} • {analytics?.role?.toUpperCase()} View
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="current">Current Month</SelectItem>
                <SelectItem value="2025-10">October 2025</SelectItem>
                <SelectItem value="2025-09">September 2025</SelectItem>
                <SelectItem value="2025-08">August 2025</SelectItem>
                <SelectItem value="2025-07">July 2025</SelectItem>
                <SelectItem value="2025-06">June 2025</SelectItem>
                <SelectItem value="2025-05">May 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Role-specific content */}
        {isAdmin && <AdminDashboard data={analytics} />}
        {isManager && !isAdmin && <ManagerDashboard data={analytics} />}
        {!isAdmin && !isManager && <EmployeeDashboard data={analytics} />}
      </div>
    </Layout>
  );
};

// Admin Dashboard Component
const AdminDashboard = ({ data }: any) => {
  console.log('Admin Dashboard Data:', data);
  
  const categoryData = Object.entries(data.categoryBreakdown || {}).map(([name, value]: any) => ({
    name,
    amount: value.amount,
    count: value.count
  }));
  
  console.log('Category Data for Chart:', categoryData);
  console.log('Top Spenders:', data.topSpenders);

  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.users?.managers || 0} managers, {data.users?.employees || 0} employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.expenses?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.expenses?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.amounts?.total || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(data.amounts?.approved || 0).toFixed(2)} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.budgetOverview?.usersOverBudget || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Users over budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.expenses?.pending || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">
              ${(data.amounts?.pending || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.expenses?.approved || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">
              ${(data.amounts?.approved || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.expenses?.rejected || 0}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No expense data yet</p>
                  <p className="text-sm">Submit and approve expenses to see charts</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Spenders */}
        <Card>
          <CardHeader>
            <CardTitle>Top Spenders</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.topSpenders || data.topSpenders.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No spending data yet</p>
                  <p className="text-sm">Data will appear after expenses are submitted</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.topSpenders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview Table */}
      {data.budgetOverview?.details && data.budgetOverview.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.budgetOverview.details.map((user: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          user.percentage > 100
                            ? 'bg-red-500'
                            : user.percentage > 80
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(user.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-bold">{user.percentage.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">
                      {user.currency} {user.spent.toFixed(2)} / {user.budget.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// Manager Dashboard Component
const ManagerDashboard = ({ data }: any) => {
  const categoryData = Object.entries(data.categoryBreakdown || {}).map(([name, value]: any) => ({
    name,
    amount: value.amount,
    count: value.count
  }));

  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.team?.size || 0}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {data.pendingApprovals || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.expenses?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data.expenses?.approved || 0} approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data.amounts?.total || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Team Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Member Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Team Member Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.team?.members || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalSpent" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Team Member Details */}
      <Card>
        <CardHeader>
          <CardTitle>Team Member Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.team?.members?.map((member: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium">{member.name}</p>
                  {member.budget > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full ${
                          member.budgetPercentage > 100
                            ? 'bg-red-500'
                            : member.budgetPercentage > 80
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(member.budgetPercentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <p className="font-bold">{member.currency} {member.totalSpent.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.expenseCount} expenses
                  </p>
                  {member.budget > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {member.budgetPercentage.toFixed(1)}% of budget
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Employee Dashboard Component
const EmployeeDashboard = ({ data }: any) => {
  const categoryData = Object.entries(data.categoryBreakdown || {}).map(([name, value]: any) => ({
    name,
    amount: value.amount,
    count: value.count
  }));

  const budgetPercentage = data.budget?.percentage || 0;
  const isOverBudget = data.budget?.isOverBudget || false;
  const isNearLimit = data.budget?.isNearLimit || false;

  return (
    <>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.expenses?.total || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {data.expenses?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(data.amounts?.pending || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.expenses?.approved || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(data.amounts?.approved || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.expenses?.rejected || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(data.amounts?.rejected || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Card */}
      {data.budget?.monthly > 0 && (
        <Card className={
          isOverBudget
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : isNearLimit
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
            : 'border-green-500 bg-green-50 dark:bg-green-950/20'
        }>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Monthly Budget</span>
              {isOverBudget && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {isNearLimit && !isOverBudget && <AlertTriangle className="h-5 w-5 text-amber-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="text-2xl font-bold">
                    {data.budget.currency} {data.budget.monthly.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Used</p>
                  <p className="text-2xl font-bold">
                    {data.budget.currency} {data.budget.used.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-2xl font-bold ${
                    data.budget.remaining < 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {data.budget.currency} {Math.abs(data.budget.remaining).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Usage</span>
                  <span className="font-bold">{budgetPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${
                      isOverBudget
                        ? 'bg-red-500'
                        : isNearLimit
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {isOverBudget && (
                <p className="text-sm text-red-600 font-medium">
                  ⚠️ You have exceeded your monthly budget. Please contact your manager.
                </p>
              )}
              {isNearLimit && !isOverBudget && (
                <p className="text-sm text-amber-600 font-medium">
                  ⚠️ You are approaching your budget limit ({data.budget.alertThreshold}%).
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AnalyticsDashboard;
