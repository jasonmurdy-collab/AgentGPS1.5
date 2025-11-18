
import React, { useState, useEffect, useCallback, useMemo, DragEvent, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import type { TodoItem, Priority, ClientLead, Candidate } from '../types';
// FIX: import X icon from lucide-react
import { ListTodo, PlusCircle, CheckSquare, Square, Edit, Trash2, ChevronDown, Sparkles, User, Link as LinkIcon, GripVertical, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

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

// --- MODAL COMPONENT ---

interface TodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'isCompleted'>>, todoId?: string) => Promise<void>;
    todoToEdit: TodoItem | null;
    initialDueDate?: string;
    linkableContacts: { leads: ClientLead[], candidates: Candidate[] };
}

const TodoModal: React.FC<TodoModalProps> = ({ isOpen, onClose, onSubmit, todoToEdit, initialDueDate, linkableContacts }) => {
    const [text, setText] = useState('');
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [priority, setPriority] = useState<Priority>('Medium');
    const [loading, setLoading] = useState(false);

    const [contactSearch, setContactSearch] = useState('');
    const [selectedContact, setSelectedContact] = useState<{ id: string; name: string; type: 'lead' | 'candidate' } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setText(todoToEdit?.text || '');
            setDueDate(todoToEdit?.dueDate || initialDueDate || formatDateForInput(new Date()));
            setPriority(todoToEdit?.priority || 'Medium');
            if (todoToEdit?.clientLeadId && todoToEdit.clientLeadName) {
                setSelectedContact({ id: todoToEdit.clientLeadId, name: todoToEdit.clientLeadName, type: 'lead' });
            } else if (todoToEdit?.candidateId && todoToEdit.candidateName) {
                setSelectedContact({ id: todoToEdit.candidateId, name: todoToEdit.candidateName, type: 'candidate' });
            } else {
                setSelectedContact(null);
            }
            setContactSearch('');
        }
    }, [isOpen, todoToEdit, initialDueDate]);

    const searchResults = useMemo(() => {
        if (!contactSearch) return [];
        const lowerSearch = contactSearch.toLowerCase();
        const leads = linkableContacts.leads
            .filter(l => l.name.toLowerCase().includes(lowerSearch))
            .map(l => ({ ...l, type: 'lead' as const }));
        const candidates = linkableContacts.candidates
            .filter(c => c.name.toLowerCase().includes(lowerSearch))
            .map(c => ({ ...c, type: 'candidate' as const }));
        return [...leads, ...candidates].slice(0, 5);
    }, [contactSearch, linkableContacts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        try {
            const data: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'isCompleted'>> = {
                text: text.trim(),
                dueDate,
                priority,
                clientLeadId: selectedContact?.type === 'lead' ? selectedContact.id : null,
                candidateId: selectedContact?.type === 'candidate' ? selectedContact.id : null,
            };
            await onSubmit(data, todoToEdit?.id);
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
            <Card className="w-full max-w-lg">
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
                                {Object.keys(priorityOrder).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="todo-contact" className="text-xs font-medium text-text-secondary mb-1">Link to Contact (Optional)</label>
                        {selectedContact ? (
                            <div className="flex items-center justify-between p-2 bg-input rounded-md">
                                <span className="text-sm font-semibold">{selectedContact.name}</span>
                                <button type="button" onClick={() => setSelectedContact(null)} className="p-1 text-destructive hover:bg-destructive/10 rounded-full"><X size={14}/></button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input id="todo-contact" type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search leads or candidates..." className="w-full bg-input border-border border rounded-md px-3 py-2 text-sm" />
                                {searchResults.length > 0 && (
                                    <div className="absolute w-full bg-surface border border-border rounded-md mt-1 z-10 max-h-40 overflow-y-auto">
                                        {searchResults.map(contact => (
                                            <button key={contact.id} type="button" onClick={() => { setSelectedContact({ id: contact.id, name: contact.name, type: contact.type }); setContactSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10">
                                                {contact.name} <span className="text-xs text-text-secondary">({contact.type})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
    onToggleComplete: (todo: TodoItem) => void;
    onEdit: (todo: TodoItem) => void;
    onDelete: (todoId: string) => void;
    onAddTask: (text: string, dueDate: string | null) => void;
    onDropOnSection: (e: DragEvent, sectionTitle: string) => void;
    onDragStart: (e: DragEvent, todo: TodoItem) => void;
    onDragEnd: (e: DragEvent) => void;
    onDropOnItem: (e: DragEvent, dropIndex: number) => void;
}

const TodoSection: React.FC<TodoSectionProps> = React.memo(({ title, todos, onToggleComplete, onEdit, onDelete, onAddTask, onDropOnSection, onDragStart, onDragEnd, onDropOnItem }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleStartAdding = () => {
        setIsAdding(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleAddTask = () => {
        if (!newItemText.trim()) {
            setIsAdding(false);
            return;
        }
        const date = ['Anytime', 'Overdue'].includes(title) ? null : title;
        onAddTask(newItemText.trim(), date);
        setNewItemText('');
        // Keep input open for more quick adds
    };
    
    return (
        <div onDrop={e => onDropOnSection(e, title)} onDragOver={e => e.preventDefault()}>
            <h2 className="font-bold text-lg flex items-center gap-2 p-2">{title}<span className="text-sm font-normal bg-background px-2 py-0.5 rounded-full">{todos.length}</span></h2>
            <Card className="p-0">
                <div className="divide-y divide-border">
                    {todos.map((todo, index) => (
                        <div 
                            key={todo.id}
                            draggable={!todo.isCompleted}
                            onDragStart={e => onDragStart(e, todo)}
                            onDragEnd={onDragEnd}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => onDropOnItem(e, index)}
                            className="p-3 flex items-start gap-3 group"
                        >
                            <button className="mt-0.5" onClick={() => onToggleComplete(todo)} aria-label={todo.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}>
                                {todo.isCompleted ? <CheckSquare size={20} className="text-primary"/> : <Square size={20} className="text-text-secondary"/>}
                            </button>
                            <div className={`flex-1 ${todo.isCompleted ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                                <p>{todo.text}</p>
                                {(todo.clientLeadName || todo.candidateName) && (
                                    <Link to={todo.clientLeadId ? `/client-pipeline` : `/recruitment-hub`} className="flex items-center gap-1 text-xs text-accent-secondary hover:underline mt-1">
                                        <User size={12} />
                                        {todo.clientLeadName || todo.candidateName}
                                    </Link>
                                )}
                            </div>
                            <PriorityBadge priority={todo.priority} />
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button onClick={() => onEdit(todo)} className="p-2 text-text-secondary hover:bg-primary/10 rounded-full" aria-label={`Edit task: ${todo.text}`}><Edit size={14}/></button>
                                <button onClick={() => onDelete(todo.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-full" aria-label={`Delete task: ${todo.text}`}><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                    {isAdding ? (
                        <div className="p-3">
                            <input
                                ref={inputRef}
                                type="text"
                                value={newItemText}
                                onChange={e => setNewItemText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setIsAdding(false); }}
                                onBlur={() => { setIsAdding(false); setNewItemText(''); }}
                                placeholder="Add a task & hit Enter"
                                className="w-full bg-input border-border border rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                    ) : (
                        <button onClick={handleStartAdding} className="w-full text-left p-3 flex items-center gap-3 text-text-secondary hover:text-primary">
                            <PlusCircle size={20} /> Add Task
                        </button>
                    )}
                </div>
            </Card>
        </div>
    );
});

const TodoPage: React.FC = () => {
    const { getTodosForUserDateRange, getUndatedTodosForUser, addTodo, updateTodo, deleteTodo, getLinkableContacts } = useAuth();
    const [datedTodos, setDatedTodos] = useState<TodoItem[]>([]);
    const [undatedTodos, setUndatedTodos] = useState<TodoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [todoToEdit, setTodoToEdit] = useState<TodoItem | null>(null);
    const [viewMode, setViewMode] = useState<'date' | 'priority'>('date');
    const [draggedItem, setDraggedItem] = useState<TodoItem | null>(null);
    const [linkableContacts, setLinkableContacts] = useState<{ leads: ClientLead[], candidates: Candidate[] }>({ leads: [], candidates: [] });

    const fetchTodos = useCallback(async () => {
        setLoading(true);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 365);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 365);
        try {
            const [dated, undated, contacts] = await Promise.all([
                getTodosForUserDateRange(formatDateForInput(startDate), formatDateForInput(endDate)),
                getUndatedTodosForUser(),
                getLinkableContacts()
            ]);
            setDatedTodos(dated);
            setUndatedTodos(undated);
            setLinkableContacts(contacts);
        } catch (error) {
            console.error("Failed to fetch todos:", error);
        } finally {
            setLoading(false);
        }
    }, [getTodosForUserDateRange, getUndatedTodosForUser, getLinkableContacts]);

    useEffect(() => {
        fetchTodos();
    }, [fetchTodos]);

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

    const handleSubmit = async (data: Partial<Omit<TodoItem, 'id' | 'userId' | 'createdAt' | 'isCompleted'>>, todoId?: string) => {
        if (todoId) {
            await updateTodo(todoId, data);
        } else {
            await addTodo(data);
        }
        fetchTodos();
    };

    const handleInlineAddTask = useCallback(async (text: string, dueDate: string | null) => {
        await addTodo({ text, dueDate, priority: 'Medium' });
        fetchTodos();
    }, [addTodo, fetchTodos]);

    const handleDragStart = (e: DragEvent, todo: TodoItem) => {
        setDraggedItem(todo);
    };

    const handleDropOnSection = async (e: DragEvent, sectionTitle: string) => {
        if (!draggedItem || viewMode !== 'date') return;
        
        let newDueDate: string | null = null;
        if (sectionTitle !== 'Anytime' && sectionTitle !== 'Overdue') {
            const dateMap: Record<string, () => Date> = {
                'Today': () => new Date(),
                'Tomorrow': () => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    return d;
                }
            };
            const dateFn = dateMap[sectionTitle];
            newDueDate = dateFn ? formatDateForInput(dateFn()) : sectionTitle;
        }

        if (draggedItem.dueDate !== newDueDate) {
            await updateTodo(draggedItem.id, { dueDate: newDueDate });
            fetchTodos();
        }
    };

    const handleDropOnItem = async (e: DragEvent, dropIndex: number) => {
        if (!draggedItem || viewMode !== 'date') return;
        const currentList = groupedTodos.find(g => g.todos.some(t => t.id === draggedItem.id))?.todos;
        if (!currentList) return;

        const draggedIndex = currentList.findIndex(t => t.id === draggedItem.id);
        if (draggedIndex === -1 || draggedIndex === dropIndex) return;
        
        const dropTarget = currentList[dropIndex];
        const itemBefore = dropIndex > 0 ? currentList[dropIndex - 1] : null;
        const itemAfter = dropTarget;

        let newOrder;
        if (!itemBefore) { // Dropped at the top
            newOrder = (itemAfter.order || Date.now()) + 1000;
        } else if (!itemAfter) { // Dropped at the bottom (should not happen with this logic but for safety)
            newOrder = (itemBefore.order || 0) - 1000;
        } else { // Dropped in between
            newOrder = (itemBefore.order + itemAfter.order) / 2;
        }
        
        await updateTodo(draggedItem.id, { order: newOrder });
        fetchTodos();
    };

    const groupedTodos = useMemo(() => {
        const allTodos = [...datedTodos, ...undatedTodos];
        const sortFnByOrder = (a: TodoItem, b: TodoItem) => (a.isCompleted !== b.isCompleted) ? (a.isCompleted ? 1 : -1) : ((b.order || 0) - (a.order || 0));
        
        if (viewMode === 'priority') {
            const groups: Record<Priority, TodoItem[]> = { 'Urgent': [], 'High': [], 'Medium': [], 'Low': [] };
            for (const todo of allTodos) { groups[todo.priority]?.push(todo); }
            return (Object.keys(groups) as Priority[]).sort((a,b) => priorityOrder[a] - priorityOrder[b]).map(p => ({ title: p, todos: groups[p].sort((a,b) => (a.isCompleted !== b.isCompleted) ? (a.isCompleted ? 1 : -1) : (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity))})).filter(g => g.todos.length > 0);
        }
        
        const today = getStartOfDay(new Date());
        const groups: Record<string, TodoItem[]> = { 'Overdue': [], 'Anytime': [] };
        for (const todo of allTodos) {
            if (todo.dueDate) {
                const dueDate = getStartOfDay(new Date(todo.dueDate));
                if (!todo.isCompleted && dueDate < today) { groups['Overdue'].push(todo); }
                else { const dateKey = formatDateForInput(dueDate); if (!groups[dateKey]) groups[dateKey] = []; groups[dateKey].push(todo); }
            } else { groups['Anytime'].push(todo); }
        }
        
        const sortedEntries = Object.entries(groups).map(([title, todos]) => ({ title, todos: todos.sort(sortFnByOrder) })).filter(g => g.todos.length > 0);
        const order = ['Overdue', formatDateForInput(today), formatDateForInput(new Date(today.getTime() + 86400000))];
        sortedEntries.sort((a, b) => {
            const aIndex = order.indexOf(a.title);
            const bIndex = order.indexOf(b.title);
            if (a.title === 'Anytime') return 1; if (b.title === 'Anytime') return -1;
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1; if (bIndex !== -1) return 1;
            return new Date(a.title).getTime() - new Date(b.title).getTime();
        });
        return sortedEntries;
    }, [datedTodos, undatedTodos, viewMode]);

    return (
        <div className="h-full flex flex-col">
            <header className="p-4 sm:p-6 lg:p-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-text-primary flex items-center gap-4"><ListTodo className="text-accent-secondary" size={48} /> My To-Do List</h1>
                    <button onClick={() => { setTodoToEdit(null); setIsModalOpen(true); }} className="flex items-center justify-center bg-primary text-on-accent font-semibold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"><PlusCircle className="mr-2" size={20} /> New Task</button>
                </div>
            </header>

            <div className="px-4 sm:px-6 lg:px-8 mb-6">
                 <div className="flex items-center gap-2 p-1 bg-surface rounded-lg w-fit">
                    <button onClick={() => setViewMode('date')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'date' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/20'}`}>Group by Date</button>
                    <button onClick={() => setViewMode('priority')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'priority' ? 'bg-primary text-on-accent' : 'text-text-secondary hover:bg-primary/20'}`}>Group by Priority</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
                {loading ? <div className="flex justify-center py-8"><Spinner /></div> : (
                    <div className="space-y-6">
                        {groupedTodos.length > 0 ? (
                            groupedTodos.map(({ title, todos }) => (
                                <TodoSection
                                    key={title}
                                    title={viewMode === 'date' ? formatDisplayDate(title) : title}
                                    todos={todos}
                                    onToggleComplete={handleToggleComplete}
                                    onEdit={(todo) => { setTodoToEdit(todo); setIsModalOpen(true); }}
                                    onDelete={handleDelete}
                                    onAddTask={handleInlineAddTask}
                                    onDropOnSection={handleDropOnSection}
                                    onDragStart={handleDragStart}
                                    onDragEnd={() => setDraggedItem(null)}
                                    onDropOnItem={handleDropOnItem}
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
            <TodoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} todoToEdit={todoToEdit} linkableContacts={linkableContacts} />
        </div>
    );
};

export default TodoPage;
