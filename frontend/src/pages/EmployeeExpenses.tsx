import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, FileText, MessageSquare } from "lucide-react";
import { expenseApi, type Expense } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" }
};

const EmployeeExpenses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false);

  // Fetch user's expenses
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['myExpenses'],
    queryFn: async () => {
      const response = await expenseApi.getMyExpenses();
      return response.data?.expenses || [];
    },
  });

  const handleViewComments = (expense: Expense) => {
    setSelectedExpense(expense);
    setCommentsDialogOpen(true);
  };

  const calculateTotalByStatus = (status: string) => {
    return expenses
      .filter(exp => exp.status === status)
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const pendingTotal = calculateTotalByStatus("pending");
  const approvedTotal = calculateTotalByStatus("approved");
  const rejectedTotal = calculateTotalByStatus("rejected");

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading expenses. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">My Expenses</h1>
          <Button onClick={() => navigate("/submit-expense")} className="gap-2">
            <Plus className="w-4 h-4" />
            Submit New Expense
          </Button>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Pending</div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                ${pendingTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Approved</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                ${approvedTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${rejectedTotal.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No expenses found</p>
                <Button onClick={() => navigate("/submit-expense")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableRow 
                          key={expense._id}
                          className="hover:bg-muted/50"
                        >
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
                              <span className="text-muted-foreground text-sm">No receipt</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasComments ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleViewComments(expense)}
                                    >
                                      <MessageSquare className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View comments</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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

            {!selectedExpense?.approvalSequence?.some(a => a.comments) && 
             !selectedExpense?.finalApproval?.finalComments && (
              <p className="text-center text-muted-foreground py-4">
                No comments available for this expense
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmployeeExpenses;
