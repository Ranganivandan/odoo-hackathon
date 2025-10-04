import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { approvalRuleApi, userApi, companyApi, type ApprovalRule, type User } from "@/lib/api";

const ApprovalRules = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "percentage" as "percentage" | "specific_approver" | "hybrid" | "sequential",
    percentage: 50,
    specificApprovers: [] as string[],
    minAmount: 0,
    maxAmount: 10000,
    categoryFilter: [] as string[],
    priority: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch approval rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: async () => {
      const response = await approvalRuleApi.getAll();
      return response.data?.rules || [];
    },
  });

  // Fetch users for approver selection
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await userApi.getAll();
      return response.data?.users || [];
    },
  });

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const response = await companyApi.getCategories();
      return response.data?.categories || [];
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: approvalRuleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast({
        title: "Success",
        description: "Approval rule created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create approval rule",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      approvalRuleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast({
        title: "Success",
        description: "Approval rule updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingRule(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update approval rule",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: approvalRuleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast({
        title: "Success",
        description: "Approval rule deleted successfully",
      });
      setDeleteRuleId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete approval rule",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "percentage",
      percentage: 50,
      specificApprovers: [],
      minAmount: 0,
      maxAmount: 10000,
      categoryFilter: [],
      priority: 0,
    });
  };

  const handleCreateRule = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }

    const ruleData = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      conditions: getConditionsForType(),
      amountThreshold: {
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
      },
      categoryFilter: formData.categoryFilter,
      priority: formData.priority,
    };

    createRuleMutation.mutate(ruleData);
  };

  const handleUpdateRule = () => {
    if (!editingRule || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }

    const ruleData = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      conditions: getConditionsForType(),
      amountThreshold: {
        minAmount: formData.minAmount,
        maxAmount: formData.maxAmount,
      },
      categoryFilter: formData.categoryFilter,
      priority: formData.priority,
    };

    updateRuleMutation.mutate({ id: editingRule._id, data: ruleData });
  };

  const getConditionsForType = () => {
    switch (formData.type) {
      case 'percentage':
        return { percentage: formData.percentage };
      case 'specific_approver':
        return { specificApprovers: formData.specificApprovers };
      case 'hybrid':
        return {
          hybrid: {
            percentage: formData.percentage,
            specificApprovers: formData.specificApprovers,
          },
        };
      case 'sequential':
        return {
          sequential: formData.specificApprovers.map((approverId, index) => ({
            approver: approverId,
            sequence: index + 1,
            isRequired: true,
          })),
        };
      default:
        return {};
    }
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || "",
      type: rule.type,
      percentage: rule.conditions.percentage || 50,
      specificApprovers: rule.conditions.specificApprovers?.map(a => a.id) || 
                       rule.conditions.hybrid?.specificApprovers?.map(a => a.id) || 
                       rule.conditions.sequential?.map(s => s.approver.id) || [],
      minAmount: rule.amountThreshold.minAmount,
      maxAmount: rule.amountThreshold.maxAmount,
      categoryFilter: rule.categoryFilter,
      priority: rule.priority,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    setDeleteRuleId(ruleId);
  };

  const confirmDelete = () => {
    if (deleteRuleId) {
      deleteRuleMutation.mutate(deleteRuleId);
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Percentage Based';
      case 'specific_approver': return 'Specific Approvers';
      case 'hybrid': return 'Hybrid';
      case 'sequential': return 'Sequential';
      default: return type;
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'percentage': return 'bg-blue-100 text-blue-800';
      case 'specific_approver': return 'bg-green-100 text-green-800';
      case 'hybrid': return 'bg-purple-100 text-purple-800';
      case 'sequential': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Approval Rules</h1>
            <p className="text-muted-foreground">
              Configure approval workflows and sequences for expense management
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Approval Rule</DialogTitle>
                <DialogDescription>
                  Define a new approval rule for expense management
                </DialogDescription>
              </DialogHeader>
              <RuleForm 
                formData={formData}
                setFormData={setFormData}
                users={users}
                categories={categories}
                onSubmit={handleCreateRule}
                isLoading={createRuleMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Rules List */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Approval Rules
            </CardTitle>
            <CardDescription>
              Manage your company's approval rules and workflows
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No approval rules found</p>
                <p>Create your first approval rule to get started</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Rule Name</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Amount Range</TableHead>
                      <TableHead className="font-semibold">Categories</TableHead>
                      <TableHead className="font-semibold">Priority</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            {rule.description && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {rule.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRuleTypeColor(rule.type)}>
                            {getRuleTypeLabel(rule.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            ${rule.amountThreshold.minAmount.toLocaleString()} - 
                            ${rule.amountThreshold.maxAmount === Number.MAX_SAFE_INTEGER 
                              ? '∞' 
                              : rule.amountThreshold.maxAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {rule.categoryFilter.length === 0 ? (
                              <span className="text-muted-foreground">All categories</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {rule.categoryFilter.slice(0, 2).map((category) => (
                                  <Badge key={category} variant="outline" className="text-xs">
                                    {category}
                                  </Badge>
                                ))}
                                {rule.categoryFilter.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{rule.categoryFilter.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={rule.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRule(rule)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule._id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Approval Rule</DialogTitle>
              <DialogDescription>
                Update the approval rule configuration
              </DialogDescription>
            </DialogHeader>
            <RuleForm 
              formData={formData}
              setFormData={setFormData}
              users={users}
              categories={categories}
              onSubmit={handleUpdateRule}
              isLoading={updateRuleMutation.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Approval Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this approval rule? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteRuleMutation.isPending}
              >
                {deleteRuleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

// Rule Form Component
const RuleForm = ({ 
  formData, 
  setFormData, 
  users, 
  categories, 
  onSubmit, 
  isLoading 
}: {
  formData: any;
  setFormData: (data: any) => void;
  users: User[];
  categories: any[];
  onSubmit: () => void;
  isLoading: boolean;
}) => {
  const managers = users.filter(user => user.role === 'manager' || user.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Rule Name *</Label>
          <Input
            id="name"
            placeholder="e.g., High-value expense approval"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Rule Type *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage Based</SelectItem>
              <SelectItem value="specific_approver">Specific Approvers</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="sequential">Sequential</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe this approval rule..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="minAmount">Minimum Amount</Label>
          <Input
            id="minAmount"
            type="number"
            min="0"
            value={formData.minAmount}
            onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxAmount">Maximum Amount</Label>
          <Input
            id="maxAmount"
            type="number"
            min="0"
            value={formData.maxAmount}
            onChange={(e) => setFormData({ ...formData, maxAmount: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Expense Categories</Label>
        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
          {categories.map((category) => (
            <div key={category._id} className="flex items-center space-x-2">
              <Checkbox
                id={category._id}
                checked={formData.categoryFilter.includes(category.name)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData({
                      ...formData,
                      categoryFilter: [...formData.categoryFilter, category.name]
                    });
                  } else {
                    setFormData({
                      ...formData,
                      categoryFilter: formData.categoryFilter.filter((cat: string) => cat !== category.name)
                    });
                  }
                }}
              />
              <Label htmlFor={category._id} className="text-sm">
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {(formData.type === 'percentage' || formData.type === 'hybrid') && (
        <div className="space-y-2">
          <Label htmlFor="percentage">Approval Percentage</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="percentage"
              type="number"
              min="1"
              max="100"
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
      )}

      {(formData.type === 'specific_approver' || formData.type === 'hybrid' || formData.type === 'sequential') && (
        <div className="space-y-2">
          <Label>Approvers</Label>
          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
            {managers.map((manager) => (
              <div key={manager.id} className="flex items-center space-x-2">
                <Checkbox
                  id={manager.id}
                  checked={formData.specificApprovers.includes(manager.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({
                        ...formData,
                        specificApprovers: [...formData.specificApprovers, manager.id]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        specificApprovers: formData.specificApprovers.filter((id: string) => id !== manager.id)
                      });
                    }
                  }}
                />
                <Label htmlFor={manager.id} className="text-sm">
                  {manager.firstName} {manager.lastName} ({manager.role})
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          min="0"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
        />
        <p className="text-xs text-muted-foreground">
          Higher numbers have higher priority. Rules are evaluated in priority order.
        </p>
      </div>

      <DialogFooter>
        <Button 
          onClick={onSubmit} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isLoading ? 'Saving...' : 'Save Rule'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default ApprovalRules;
