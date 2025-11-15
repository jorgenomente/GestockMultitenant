import { useState } from 'react';
import { FileText, Plus, Trash2, Check, X, ChevronDown, Edit2, Save, BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

export interface Note {
  id: string;
  content: string;
  timestamp: Date;
  author?: string;
  isResolved: boolean;
  lastEdited?: Date;
}

interface NotesLogProps {
  notes: Note[];
  onAddNote: (content: string) => void;
  onDeleteNote: (id: string) => void;
  onToggleResolved: (id: string) => void;
  onEditNote: (id: string, content: string) => void;
  currentUser?: string;
}

export function NotesLog({
  notes,
  onAddNote,
  onDeleteNote,
  onToggleResolved,
  onEditNote,
  currentUser = 'Usuario',
}: NotesLogProps) {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(notes.length <= 2);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      onAddNote(newNoteContent.trim());
      setNewNoteContent('');
    } else {
      toast.error('La nota no puede estar vacía');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const saveEdit = () => {
    if (editContent.trim() && editingNoteId) {
      onEditNote(editingNoteId, editContent.trim());
      setEditingNoteId(null);
      setEditContent('');
    } else {
      toast.error('La nota no puede estar vacía');
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show only 1-2 most recent notes when collapsed
  const displayedNotes = isExpanded ? notes : notes.slice(0, 2);

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-sm">
      {/* Header */}
      <div 
        className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <BookOpen className="w-4 h-4 text-[#6B7280]" />
        <h3 className="text-[#0E2E2B] flex-1">Notas del pedido ({notes.length})</h3>
        <Button variant="ghost" size="sm" className="text-[#6B7280] hover:text-[#0E2E2B] h-8 w-8 p-0">
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ease-out ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`} />
        </Button>
      </div>

      {/* Add Note Input - Always visible */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Añade nota..."
          className="flex-1 border-[#D8DFE6] px-3 py-3 focus:border-[#27AE60] focus:ring-[#27AE60]"
        />
        <Button
          onClick={handleAddNote}
          disabled={!newNoteContent.trim()}
          className="bg-[#27AE60] text-white hover:bg-[#229954] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4 mr-1" />
          Añadir
        </Button>
      </div>

      {/* Notes List */}
      <div 
        className={`space-y-2 overflow-hidden transition-all duration-200 ease-out ${
          isExpanded ? 'max-h-[400px] overflow-y-auto opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {notes.length === 0 ? (
          <div className="text-center py-8 text-[#9DA3A8] text-sm bg-[#F8FAF9] rounded-xl">
            No hay notas registradas aún
          </div>
        ) : (
          <>
            {displayedNotes.map((note) => (
              <div
                key={note.id}
                className={`rounded-xl p-4 border transition-all ${
                  note.isResolved
                    ? 'bg-[#F8FAF9] border-[#EAEAEA] opacity-60'
                    : editingNoteId === note.id
                    ? 'bg-white border-[#E0F3E9] shadow-sm'
                    : 'bg-white border-[#EAEAEA] hover:border-[#27AE60] hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {editingNoteId === note.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px] resize-none border-[#E0F3E9] focus:border-[#27AE60] focus:ring-[#27AE60]"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={saveEdit}
                            className="bg-[#27AE60] text-white hover:bg-[#229954] h-8"
                          >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                            className="border-[#EAEAEA] text-[#6B7280] hover:bg-[#F3F4F6] h-8"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <p className={`text-sm text-[#0E2E2B] mb-2 ${note.isResolved ? 'line-through' : ''}`}>
                          {note.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {note.author && (
                            <>
                              <span className="font-medium text-[#6B7280]">{note.author}</span>
                              <span className="text-[#9CA3AF]">•</span>
                            </>
                          )}
                          <span className="text-[#9CA3AF]">{formatTimestamp(note.timestamp)}</span>
                          {note.lastEdited && (
                            <>
                              <span className="text-[#9CA3AF]">•</span>
                              <span className="text-[#9CA3AF] italic">
                                Última edición • {formatTimestamp(note.lastEdited)}
                              </span>
                            </>
                          )}
                          {note.isResolved && (
                            <>
                              <span className="text-[#9CA3AF]">•</span>
                              <Badge className="bg-[#27AE60] text-white text-xs h-5 px-2">
                                Resuelta
                              </Badge>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions - Hide while editing */}
                  {editingNoteId !== note.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleResolved(note.id)}
                        className={`h-7 w-7 p-0 ${
                          note.isResolved
                            ? 'text-[#6B7280] hover:text-[#EF4444] hover:bg-[#FEE2E2]'
                            : 'text-[#27AE60] hover:bg-[#E0F2F1]'
                        }`}
                        title={note.isResolved ? 'Marcar como pendiente' : 'Marcar como resuelta'}
                      >
                        {note.isResolved ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(note)}
                        className="h-7 w-7 p-0 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#0E2E2B]"
                        title="Editar nota"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteNote(note.id)}
                        className="h-7 w-7 p-0 text-[#EF4444] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Show "View all" link when collapsed and there are more notes */}
            {!isExpanded && notes.length > 2 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full py-3 text-sm text-[#27AE60] hover:text-[#229954] hover:bg-[#F8FAF9] rounded-lg transition-colors font-medium"
              >
                Ver todas las notas ({notes.length - 2} más)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}