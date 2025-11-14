import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { TodoItem, Priority } from '../types';
import { ListTodo, PlusCircle, CheckSquare, Square, Edit, Trash2, ChevronDown, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';

const formatDateForInput = (date: Date): string => date.toISOString().split('T')[0];
const getStartOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper to format date for section headers
const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return 'Anytime';
    const date = getStartOfDay(new Date(dateString));
    const today = getStartOfDay(new Date());
    const tomorrow = getStartOfDay(new Date());
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

// --- PRIORITY & SORTING HELPERS ---

const priorityOrder: Record<Priority, number> = {
    'Urgent': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
};

const priorityStyles: Record<Priority, { bg: string; text: string; border: string }> = {
    Urgent: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
    High: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500/30' },
    Medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' },
    Low: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
};

const PriorityBadge: React.FC<{ priority: Priority }> = React.memo(({ priority }) => {
    const styles = priorityStyles[priority] || priorityStyles['Medium'];
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${styles.bg} ${styles.text} border ${styles.border}`}>
            {priority}
        </span>
    );
});

const sortTodos = (a: TodoItem, b: TodoItem) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

// --- MODAL COMPONENT ---

interface TodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string, dueDate: string | null, priority: Priority, todoId?: string) => Promise<void>;
    todoToEdit: TodoItem | null;
    initialDueDate?: string;
}

const TodoModal: React.FC<TodoModalProps> = ({ isOpen, onClose, onSubmit, todoToEdit, initialDueDate }) => {
    const [text, setText] = useState('');
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [priority, setPriority] = useState<Priority>('Medium');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setText(todoToEdit?.text || '');
            setDueDate(todoToEdit?.dueDate || initialDueDate || formatDateForInput(new Date()));
            setPriority(todoToEdit?.priority || 'Medium');
        }
    }, [isOpen, todoToEdit, initialDueDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        try {
            await onSubmit(text.trim(), dueDate, priority, todoToEdit?.id);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-bold">{todoToEdit ? 'Edit Task' : 'New Task'}</h3>
                    <div>
                        <label htmlFor="todo-text" className="sr-only">Task</label>
                        <input id="todo-text" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="What needs to be done?" className="w-full bg-input border-border border rounded-md px-3 py-2" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="todo-dueDate" className="text-xs font-medium text-text-secondary mb-1">Due Date</label>
                            <input id="todo-dueDate" type="date" value={dueDate || ''} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-input border-border border rounded-md px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="todo-priority" className="text-xs font-medium text-text-secondary mb-1">Priority</label>
                            <select id="todo-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full bg-input border-border border rounded-md px-3 py-2 text-sm">
                                <option value="Urgent">Urgent</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg text-text-secondary hover:bg-primary/10">Cancel</button>
                        <button type="submit" disabled={loading} className="py-2 px-4 rounded-lg bg-primary text-on-accent font-semibold">{loading ? <Spinner /> : (todoToEdit ? 'Save Changes' : 'Add Task')}</button>
                    </div>
                </form>
            </Card>
        </div>,
        document.body
    );
};


// --- TODO SECTION COMPONENT ---

interface TodoSectionProps {
    title: string;
    todos: TodoItem[];
    isExpanded: boolean;
    onToggle: () => void;
    onToggleComplete: (todo: TodoItem) => void;
    onEdit: (todo: TodoItem) => void;
    onDelete: (todoId: string) => void;
    isOverdue?: boolean;
}

const TodoSection: React.FC<TodoSectionProps> = ({ title, todos, isExpanded, onToggle, onToggleComplete, onEdit, onDelete, isOverdue = false }) => (
    <div>
        <button
            onClick={onToggle}
            className={`w-full flex justify-between items-center p-3 rounded-t-lg transition-colors ${
                isOverdue ? 'bg-destructive/10' : 'bg-surface'
            } hover:bg-primary/5`}
            aria-expanded={isExpanded}
        >
            <h2 className={`font-bold text-lg flex items-center gap-2 ${isOverdue ? 'text-destructive' : 'text-text-primary'}`}>
                {title}
                <span className={`text-sm font-normal px-2 py-0.5 rounded-full ${isOverdue ? 'bg-destructive/20' : 'bg-background'}`}>
                    {todos.length}
                </span>
            </h2>
            <ChevronDown size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
            <Card className="p-0 rounded-t-none">
                <div className="divide-y divide-border">
                    {todos.map(todo => (
                        <div key={todo.id} className="p-3 flex items-center gap-3 group">
                            <button onClick={() => onToggleComplete(todo)} aria-label={todo.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}>
                                {todo.isCompleted ? <CheckSquare size={20} className="text-primary"/> : <Square size={20} className="text-text-secondary"/>}
                            </button>
                            <div className={`flex-1 ${todo.isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                <p>{todo.text}</p>
                            </div>
                            <PriorityBadge priority={todo.priority} />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button onClick={() => onEdit(todo)} className="p-2 text-text-secondary hover:bg-primary/10 rounded-full" aria-label={`Edit task: ${todo.text}`}><Edit size={14}/></button>
                                <button onClick={() => onDelete(todo.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full" aria-label={`Delete task: ${todo.text}`}><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        )}
    </div>
);

// --- MAIN PAGE COMPONENT ---

const TodoPage: React.FC = () => {
    const { getTodosForUserDateRange, getUndatedTodosForUser, addTodo, updateTodo, deleteTodo } = useAuth();
    const [datedTodos, setDatedTodos] = useState<TodoItem[]>([]);
    const [undatedTodos, setUndatedTodos] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [todoToEdit, setTodoToEdit] = useState<TodoItem | null>(null);
    const [quickAddText, setQuickAddText] = useState('');
    const [quickAddLoading, setQuickAddLoading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'Overdue': true, 'Today': true });

    const fetchTodos = useCallback(async () => {
        setLoading(true);
        // Fetch a wider range to handle overdue items correctly
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365); 
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365);

        try {
            const [dated, undated] = await Promise.all([
                getTodosForUserDateRange(formatDateForInput(startDate), formatDateForInput(endDate)),
                getUndatedTodosForUser()
            ]);
            setDatedTodos(dated);
            setUndatedTodos(undated);
        } catch (error) {
            console.error("Failed to fetch todos:", error);
        } finally {
            setLoading(false);
        }
    }, [getTodosForUserDateRange, getUndatedTodosForUser]);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);
    
    const groupedTodos = useMemo(() => {
        const today = getStartOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const groups: Record<string, TodoItem[]> = { 'Overdue': [], 'Today': [], 'Tomorrow': [], 'Anytime': [] };

        const allTodos = [...datedTodos, ...undatedTodos];

        for (const todo of allTodos) {
            if (todo.dueDate) {
                const dueDate = getStartOfDay(new Date(todo.dueDate));
                if (!todo.isCompleted && dueDate < today) {
                    groups['Overdue'].push(todo);
                } else if (dueDate.getTime() === today.getTime()) {
                    groups['Today'].push(todo);
                } else if (dueDate.getTime() === tomorrow.getTime()) {
                    groups['Tomorrow'].push(todo);
                } else {
                    const dateKey = formatDateForInput(dueDate);
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(todo);
                }
            } else {
                groups['Anytime'].push(todo);
            }
        }
        
        const sortedGroupEntries = Object.entries(groups)
            .map(([title, todos]) => ({ title, todos: todos.sort(sortTodos) }))
            .filter(group => group.todos.length > 0);

        const groupOrder = ['Overdue', 'Today', 'Tomorrow'];
        sortedGroupEntries.sort((a, b) => {
            const aIndex = groupOrder.indexOf(a.title);
            const bIndex = groupOrder.indexOf(b.title);

            if (a.title === 'Anytime') return 1;
            if (b.title === 'Anytime') return -1;
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;

            return new Date(a.title).getTime() - new Date(b.title).getTime();
        });

        return sortedGroupEntries;
    }, [datedTodos, undatedTodos]);

    const handleToggleComplete = async (todo: TodoItem) => {
        await updateTodo(todo.id, { isCompleted: !todo.isCompleted });
        fetchTodos();
    };
    
    const handleDelete = async (todoId: string) => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            await deleteTodo(todoId);
            fetchTodos();
        }
    };
    
    const handleSubmit = async (text: string, dueDate: string | null, priority: Priority, todoId?: string) => {
        if (todoId) {
            await updateTodo(todoId, { text, dueDate, priority });
        } else {
            await addTodo(text, dueDate, priority);
        }
        fetchTodos();
    };

    const handleQuickAdd = useCallback(async () => {
        if (!quickAddText.trim()) return;
        setQuickAddLoading(true);
        try {
            await addTodo(quickAddText.trim(), null, 'Medium');
            setQuickAddText('');
            fetchTodos();
        } catch (error) { console.error("Failed to add quick todo:", error); } 
        finally { setQuickAddLoading(false); }
    }, [quickAddText, addTodo, fetchTodos]);

    const toggleSection = (title: string) => {
        setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
    };

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4">
                        <ListTodo className="text-accent-secondary" size={48} />
                        My To-Do List
                    </h1>
                    <button onClick={() => { setTodoToEdit(null); setIsModalOpen(true); }} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">
                        <PlusCircle className="mr-2" size={20} />
                        New Task
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                <Card className="mb-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles size={24}/> Quick Add Task</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                            id="quick-add-todo-text" type="text" value={quickAddText} onChange={(e) => setQuickAddText(e.target.value)}
                            placeholder="What do you need to do?"
                            className="flex-1 w-full bg-input border-border border rounded-md px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            onKeyDown={(e) => e.key === 'Enter' && quickAddText.trim() && handleQuickAdd()}
                            aria-label="Quick add new task"
                        />
                        <button onClick={handleQuickAdd} disabled={quickAddLoading || !quickAddText.trim()} className="w-full sm:w-auto flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                            {quickAddLoading ? <Spinner /> : 'Add Task'}
                        </button>
                    </div>
                </Card>

                {loading ? <div className="flex justify-center py-8"><Spinner /></div> : (
                    <div className="space-y-6">
                        {groupedTodos.length > 0 ? (
                            groupedTodos.map(({ title, todos }) => (
                                <TodoSection
                                    key={title}
                                    title={title === 'Anytime' || title === 'Overdue' ? title : formatDisplayDate(title)}
                                    todos={todos}
                                    isExpanded={!!expandedSections[title]}
                                    onToggle={() => toggleSection(title)}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={(todo) => { setTodoToEdit(todo); setIsModalOpen(true); }}
                                    onDelete={handleDelete}
                                    isOverdue={title === 'Overdue'}
                                />
                            ))
                        ) : (
                            <Card className="text-center py-12">
                                <h2 className="text-xl font-bold">All clear!</h2>
                                <p className="text-text-secondary mt-1">You have no tasks. Add one to get started.</p>
                            </Card>
                        )}
                    </div>
                )}
            </div>
            <TodoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} todoToEdit={todoToEdit} />
        </div>
    );
};

export default TodoPage;
