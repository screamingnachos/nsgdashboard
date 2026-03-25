"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ActionHub() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamRoster, setTeamRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  
  // Track if we are editing an existing task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Form States
  const [newMemberName, setNewMemberName] = useState('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    due_date: '',
    assignees: [] as string[]
  });

  useEffect(() => {
    fetchTasksAndRoster();
  }, []);

  async function fetchTasksAndRoster() {
    const { data: taskData } = await supabase
      .from('team_tasks')
      .select('*')
      .order('created_at', { ascending: false });
      
    const { data: rosterData } = await supabase
      .from('team_roster')
      .select('*')
      .order('name', { ascending: true });
      
    if (taskData) setTasks(taskData);
    if (rosterData) setTeamRoster(rosterData);
    setLoading(false);
  }

  // Task Functions
  async function updateTaskStatus(id: string, newStatus: string) {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await supabase.from('team_tasks').update({ status: newStatus }).eq('id', id);
  }

  // DELETE TASK FUNCTION
  async function handleDeleteTask(id: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    
    // Remove it from the screen immediately
    setTasks(tasks.filter(t => t.id !== id));
    
    // Delete it from the database
    await supabase.from('team_tasks').delete().eq('id', id);
  }

  function openCreateModal() {
    setEditingTaskId(null);
    setNewTask({ title: '', description: '', priority: 'Medium', due_date: '', assignees: [] });
    setIsTaskModalOpen(true);
  }

  function openEditModal(task: any) {
    setEditingTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date || '',
      assignees: task.assignees || []
    });
    setIsTaskModalOpen(true);
  }

  async function handleSaveTask(e: any) {
    e.preventDefault();
    
    if (editingTaskId) {
      const { data } = await supabase.from('team_tasks').update({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date,
        assignees: newTask.assignees
      }).eq('id', editingTaskId).select();

      if (data) {
        setTasks(tasks.map(t => t.id === editingTaskId ? data[0] : t));
        setIsTaskModalOpen(false);
      }
    } else {
      const { data } = await supabase.from('team_tasks').insert([{
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        due_date: newTask.due_date,
        assignees: newTask.assignees,
        status: 'To Do'
      }]).select();

      if (data) {
        setTasks([data[0], ...tasks]);
        setIsTaskModalOpen(false);
      }
    }
  }

  function toggleAssignee(name: string) {
    setNewTask(prev => ({
      ...prev,
      assignees: prev.assignees.includes(name)
        ? prev.assignees.filter(n => n !== name) 
        : [...prev.assignees, name] 
    }));
  }

  function isOverdue(dateString: string, status: string) {
    if (!dateString || status === 'Completed') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  }

  // Team Roster Functions
  async function handleAddMember(e: any) {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const { data } = await supabase.from('team_roster').insert([{ name: newMemberName.trim() }]).select();
    if (data) {
      setTeamRoster([...teamRoster, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setNewMemberName('');
    }
  }

  async function handleRemoveMember(id: string) {
    await supabase.from('team_roster').delete().eq('id', id);
    setTeamRoster(teamRoster.filter(m => m.id !== id));
  }

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Action Hub...</div>;

  const todoTasks = tasks.filter(t => t.status === 'To Do');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Action Hub</h1>
            <p className="text-slate-500 mt-1">Growth & NSO Collaboration Board</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsTeamModalOpen(true)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-bold shadow-sm">
              Manage Team
            </button>
            <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm">
              + New Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <Column title="To Do" count={todoTasks.length} bgColor="bg-slate-100">
            {todoTasks.map(task => (
              <TaskCard key={task.id} task={task} isOverdue={isOverdue(task.due_date, task.status)}
                onEdit={() => openEditModal(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onMoveRight={() => updateTaskStatus(task.id, 'In Progress')} />
            ))}
          </Column>

          <Column title="In Progress" count={inProgressTasks.length} bgColor="bg-blue-50/50">
            {inProgressTasks.map(task => (
              <TaskCard key={task.id} task={task} isOverdue={isOverdue(task.due_date, task.status)}
                onEdit={() => openEditModal(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onMoveLeft={() => updateTaskStatus(task.id, 'To Do')}
                onMoveRight={() => updateTaskStatus(task.id, 'Completed')} />
            ))}
          </Column>

          <Column title="Completed" count={completedTasks.length} bgColor="bg-green-50/50">
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} isOverdue={false}
                onEdit={() => openEditModal(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onMoveLeft={() => updateTaskStatus(task.id, 'In Progress')} />
            ))}
          </Column>
        </div>
      </div>

      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold">Manage Team Roster</h2>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <div className="p-5 max-h-64 overflow-y-auto space-y-2">
              {teamRoster.length === 0 ? <p className="text-sm text-slate-500">No team members added yet.</p> : null}
              {teamRoster.map(member => (
                <div key={member.id} className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded">
                  <span className="font-medium text-slate-700">{member.name}</span>
                  <button onClick={() => handleRemoveMember(member.id)} className="text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1 bg-red-50 rounded">Remove</button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMember} className="p-5 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input type="text" required placeholder="Add new name..." className="flex-1 border border-slate-300 rounded p-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} />
              <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold">Add</button>
            </form>
          </div>
        </div>
      )}

      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingTaskId ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Task Title</label>
                <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 h-24" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Due Date</label>
                  <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Priority</label>
                  <select className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Assign To</label>
                {teamRoster.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded border">No team members available. Add some using &quot;Manage Team&quot;.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                    {teamRoster.map(member => (
                      <label key={member.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" checked={newTask.assignees.includes(member.name)} onChange={() => toggleAssignee(member.name)} />
                        <span className="text-sm font-medium text-slate-700 truncate">{member.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
                  {editingTaskId ? 'Save Changes' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Column({ title, count, bgColor, children }: any) {
  return (
    <div className={`${bgColor} rounded-xl p-4 min-h-[500px] border border-slate-200/60`}>
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-slate-700">{title}</h3>
        <span className="bg-white text-slate-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm">{count}</span>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function TaskCard({ task, isOverdue, onMoveLeft, onMoveRight, onEdit, onDelete }: any) {
  const priorityColors: any = {
    High: "bg-red-100 text-red-700 border-red-200",
    Medium: "bg-orange-100 text-orange-700 border-orange-200",
    Low: "bg-slate-100 text-slate-700 border-slate-200"
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`text-xs font-bold ${isOverdue ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-400'}`}>
              {isOverdue && '⚠️ '} 
              {task.due_date.split('-').slice(1).join('/')}
            </span>
          )}
          <button onClick={onEdit} className="text-slate-400 hover:text-blue-600 text-xs font-bold ml-1">Edit</button>
          {/* NEW DELETE BUTTON */}
          <button onClick={onDelete} className="text-slate-400 hover:text-red-600 text-xs font-bold ml-1">Delete</button>
        </div>
      </div>

      <h4 className="font-bold text-slate-800 mb-1 leading-tight">{task.title}</h4>
      {task.description && <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>}

      <div className="flex flex-wrap gap-1 mb-4">
        {task.assignees && task.assignees.map((name: string) => (
          <span key={name} className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
            {name}
          </span>
        ))}
      </div>

      <div className="flex justify-between pt-3 border-t border-slate-100">
        {onMoveLeft ? (
          <button onClick={onMoveLeft} className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 bg-slate-50 rounded">← Back</button>
        ) : <div></div>}
        
        {onMoveRight && (
          <button onClick={onMoveRight} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded">Move Next →</button>
        )}
      </div>
    </div>
  );
}