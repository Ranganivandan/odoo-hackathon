import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, MessageSquare, Filter, Download } from "lucide-react";
import { expenseApi, userApi, type Expense } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" }
};

const ExpenseHistory = () => {
  const { isAdmin, isManager } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);

  // Fetch users for employee filter (admin only)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const response = await userApi.getAll();
      return response.data?.users || [];
    },
    enabled: isAdmin,
  });

  // Build filters object
  const filters: any = {};
  if (statusFilter !== "all") filters.status = statusFilter;
  if (categoryFilter !== "all") filters.category = categoryFilter;
  if (employeeFilter !== "all") filters.employeeId = employeeFilter;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  // Fetch expense history
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['expense-history', filters],
    queryFn: async () => {
      const response = await expenseApi.getHistory(filters);
      return response.data?.expenses || [];
    },
  });

  const handleViewComments = (expense: Expense) => {
    setSelectedExpense(expense);
    setCommentsDialogOpen(true);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setEmployeeFilter("all");
    setStartDate("");
    setEndDate("");
  };

  // Calculate totals
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const rejectedAmount = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0);

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading expense history. Please try again.</p>
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense History</h1>
          <p className="text-muted-foreground">
            {isAdmin && "View all company expenses"}
            {isManager && !isAdmin && "View team expense history"}
            {!isAdmin && !isManager && "View your expense history"}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${approvedAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">${pendingAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Meals & Entertainment">Meals & Entertainment</SelectItem>
                    <SelectItem value="Accommodation">Accommodation</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter (Admin only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expense Records ({expenses.length})</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No expenses found matching your filters</p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(isAdmin || isManager) && <TableHead>Employee</TableHead>}
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => {
                      const hasComments = expense.finalApproval?.finalComments || 
                                         expense.approvalSequence?.some(a => a.comments);
                      
                      return (
                        <TableRow key={expense._id} className="hover:bg-muted/50">
                          {(isAdmin || isManager) && (
                            <TableCell className="font-medium">
                              {expense.employee.firstName} {expense.employee.lastName}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>{format(new Date(expense.expenseDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell className="text-right font-medium">
                            {expense.currency} {expense.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusConfig[expense.status].color}>
                              {statusConfig[expense.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {expense.receipt ? (
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasComments ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewComments(expense)}
                              >
                                <MessageSquare className="h-4 w-4 text-blue-600" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comments Dialog */}
      <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval Comments</DialogTitle>
            <DialogDescription>
              View feedback from approvers for this expense
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Expense Details */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">{selectedExpense?.description}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">
                    {selectedExpense?.currency} {selectedExpense?.amount.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge variant="secondary" className={selectedExpense?.status ? statusConfig[selectedExpense.status].color : ""}>
                    {selectedExpense?.status ? statusConfig[selectedExpense.status].label : ""}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Approval Sequence Comments */}
            {selectedExpense?.approvalSequence && selectedExpense.approvalSequence.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Approval History:</h4>
                {selectedExpense.approvalSequence.map((approval, index) => (
                  <div key={index} className="border-l-4 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {approval.approver.firstName} {approval.approver.lastName}
                      </span>
                      <Badge variant="outline" className={
                        approval.status === 'approved' 
                          ? 'border-green-500 text-green-700' 
                          : approval.status === 'rejected'
                          ? 'border-red-500 text-red-700'
                          : 'border-amber-500 text-amber-700'
                      }>
                        {approval.status}
                      </Badge>
                    </div>
                    {approval.comments && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded">
                        {approval.comments}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {approval.approvedAt && format(new Date(approval.approvedAt), 'MMM dd, yyyy HH:mm')}
                      {approval.rejectedAt && format(new Date(approval.rejectedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Final Approval Comments */}
            {selectedExpense?.finalApproval?.finalComments && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Final Decision:</h4>
                <div className={`p-4 rounded-lg ${
                  selectedExpense.status === 'rejected' 
                    ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900' 
                    : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900'
                }`}>
                  <p className="text-sm">{selectedExpense.finalApproval.finalComments}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedExpense.finalApproval.approvedAt && 
                      `Approved on ${format(new Date(selectedExpense.finalApproval.approvedAt), 'MMM dd, yyyy HH:mm')}`}
                    {selectedExpense.finalApproval.rejectedAt && 
                      `Rejected on ${format(new Date(selectedExpense.finalApproval.rejectedAt), 'MMM dd, yyyy HH:mm')}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ExpenseHistory;
