import React, { useState, useEffect, useRef } from 'react';
import { Share2, Plus, X, Trash2, Edit2, Link, Check, AlertCircle } from 'lucide-react';

// --- Constantes ---
const TIERS = {
  S: { id: 'S', label: 'S - Incroyable', color: 'bg-red-100 border-red-300 text-red-900' },
  A: { id: 'A', label: 'A - Excellent', color: 'bg-orange-100 border-orange-300 text-orange-900' },
  B: { id: 'B', label: 'B - Très Bien', color: 'bg-amber-100 border-amber-300 text-amber-900' },
  C: { id: 'C', label: 'C - Sympa', color: 'bg-green-100 border-green-300 text-green-900' },
  D: { id: 'D', label: 'D - Bof', color: 'bg-blue-100 border-blue-300 text-blue-900' },
  unranked: { id: 'unranked', label: 'En attente', color: 'bg-slate-100 border-slate-300 text-slate-700' }
};

export default function App() {
  // --- État des données ---
  const [items, setItems] = useState({
    S: [], A: [], B: [], C: [], D: [],
    unranked: [
      { id: '1', content: 'Japon' },
      { id: '2', content: 'Italie' },
      { id: '3', content: 'Islande' },
    ]
  });

  // --- États UI ---
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [toast, setToast] = useState(null);
  const [dragItem, setDragItem] = useState(null); // L'item en cours de déplacement
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 }); // Position du doigt
  const [activeDropZone, setActiveDropZone] = useState(null); // Zone survolée

  // --- Initialisation (Chargement URL ou LocalStorage) ---
  useEffect(() => {
    // 1. Priorité : Vérifier si des données sont dans l'URL (?save=...)
    const params = new URLSearchParams(window.location.search);
    const saveData = params.get('save');

    if (saveData) {
      try {
        const decoded = JSON.parse(atob(saveData));
        setItems(decoded);
        showToast("Liste chargée depuis le lien !", "success");
        // Nettoyer l'URL pour qu'elle soit propre
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        showToast("Lien corrompu.", "error");
      }
    } else {
      // 2. Sinon : LocalStorage
      const localData = localStorage.getItem('tierlist-v2-mobile');
      if (localData) {
        try {
            setItems(JSON.parse(localData));
        } catch(e) {}
      }
    }
  }, []);

  // --- Sauvegarde Auto (LocalStorage uniquement) ---
  useEffect(() => {
    localStorage.setItem('tierlist-v2-mobile', JSON.stringify(items));
  }, [items]);

  // --- Gestion du Partage (URL) ---
  const copyShareLink = () => {
    try {
      // Encodage en Base64 pour l'URL
      const dataString = JSON.stringify(items);
      const encoded = btoa(dataString);
      const url = `${window.location.origin}${window.location.pathname}?save=${encoded}`;
      
      // Copier dans le presse-papier (Compatible iOS moderne)
      if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            showToast("Lien copié ! Colle-le dans tes Notes.", "success");
          });
      } else {
          // Fallback ancien (textarea hack)
          const textArea = document.createElement("textarea");
          textArea.value = url;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          showToast("Lien copié !", "success");
      }
    } catch (e) {
      showToast("Erreur lors de la création du lien", "error");
    }
  };

  // --- Logique Tactile (Touch & Mouse Drag) ---
  // Cette logique remplace le Drag & Drop HTML5 standard qui bug sur mobile
  
  const handleDragStart = (e, item, sourceTier) => {
    // Empêcher le scroll sur mobile pendant le drag
    document.body.style.overflow = 'hidden';
    
    // Coordonnées initiales (Touch ou Mouse)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragItem({ ...item, sourceTier, offsetX: 0, offsetY: 0 });
    setDragPosition({ x: clientX, y: clientY });
  };

  const handleDragMove = (e) => {
    if (!dragItem) return;
    
    // Mettre à jour la position
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragPosition({ x: clientX, y: clientY });

    // Détection de la zone de drop sous le doigt
    // On cache temporairement l'élément fantôme pour voir ce qu'il y a dessous
    const elementsUnder = document.elementsFromPoint(clientX, clientY);
    const dropZone = elementsUnder.find(el => el.getAttribute('data-tier-id'));
    
    if (dropZone) {
      setActiveDropZone(dropZone.getAttribute('data-tier-id'));
    } else {
      setActiveDropZone(null);
    }
  };

  const handleDragEnd = () => {
    if (!dragItem) {
        document.body.style.overflow = '';
        return;
    }

    if (activeDropZone && activeDropZone !== dragItem.sourceTier) {
        // Déplacement effectif
        setItems(prev => {
            const newSourceList = prev[dragItem.sourceTier].filter(i => i.id !== dragItem.id);
            const newTargetList = [...prev[activeDropZone], { id: dragItem.id, content: dragItem.content }];
            return {
                ...prev,
                [dragItem.sourceTier]: newSourceList,
                [activeDropZone]: newTargetList
            };
        });
        showToast("Déplacé !", "success");
    }

    // Reset
    setDragItem(null);
    setActiveDropZone(null);
    document.body.style.overflow = ''; // Réactiver le scroll
  };

  // Ajout des Event Listeners globaux pour le mouvement fluide
  useEffect(() => {
    if (dragItem) {
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [dragItem, activeDropZone]);


  // --- CRUD Items ---
  const addItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem = { id: Date.now().toString(), content: newItemText.trim() };
    setItems(prev => ({ ...prev, unranked: [...prev.unranked, newItem] }));
    setNewItemText('');
  };

  const deleteItem = (tierId, itemId) => {
    if(!window.confirm("Supprimer cette destination ?")) return;
    setItems(prev => ({
      ...prev,
      [tierId]: prev[tierId].filter(i => i.id !== itemId)
    }));
  };

  const startEdit = (item) => { setEditingId(item.id); setEditText(item.content); };
  const saveEdit = (tierId) => {
    setItems(prev => ({
      ...prev,
      [tierId]: prev[tierId].map(i => i.id === editingId ? { ...i, content: editText } : i)
    }));
    setEditingId(null);
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 select-none">
      
      {/* Header Mobile-Friendly */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="font-bold text-xl text-slate-800">✈️ Mes Vœux</h1>
          <p className="text-xs text-slate-500">Tier-list privée</p>
        </div>
        <button 
          onClick={copyShareLink}
          className="bg-indigo-600 active:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-transform active:scale-95"
        >
          <Share2 size={16} /> <span className="hidden sm:inline">Sauvegarder</span>
        </button>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-xl z-50 flex items-center gap-2 text-sm font-bold text-white transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <Check size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-4 space-y-4">
        
        {/* Tier List */}
        <div className="space-y-3">
          {Object.keys(TIERS).filter(k => k !== 'unranked').map(tierId => {
            const tier = TIERS[tierId];
            const isHovered = activeDropZone === tierId;
            
            return (
              <div key={tierId} className="flex rounded-lg overflow-hidden shadow-sm bg-white border border-slate-200 min-h-[85px]">
                {/* Label Rank */}
                <div className={`${tier.color} w-16 sm:w-24 flex items-center justify-center font-bold text-xl sm:text-2xl shrink-0`}>
                  {tierId}
                </div>
                
                {/* Drop Zone */}
                <div 
                  data-tier-id={tierId}
                  className={`flex-1 p-2 transition-colors ${isHovered ? 'bg-indigo-50 shadow-inner ring-2 ring-indigo-300 ring-inset' : 'bg-white'}`}
                >
                  <div className="flex flex-wrap gap-2">
                    {items[tierId].map(item => (
                      <ItemCard 
                        key={item.id} 
                        item={item} 
                        tierId={tierId} 
                        onDragStart={handleDragStart}
                        isDragging={dragItem?.id === item.id}
                        onDelete={() => deleteItem(tierId, item.id)}
                        onEdit={() => startEdit(item)}
                      />
                    ))}
                    {items[tierId].length === 0 && !isHovered && (
                        <span className="text-slate-300 text-xs italic self-center ml-2">Vide</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input & Unranked Pool */}
        <div className="mt-8">
            <h2 className="text-slate-700 font-bold mb-2 flex items-center gap-2">
                En attente 
                <span className="bg-slate-200 text-slate-600 px-2 rounded-full text-xs">{items.unranked.length}</span>
            </h2>

            {/* Formulaire ajout */}
            <form onSubmit={addItem} className="flex gap-2 mb-4">
                <input 
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-3 text-base shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Ajouter une destination..."
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                />
                <button 
                    disabled={!newItemText.trim()}
                    className="bg-slate-800 text-white px-4 rounded-lg font-bold disabled:opacity-50"
                >
                    <Plus />
                </button>
            </form>

            {/* Zone 'Unranked' */}
            <div 
                data-tier-id="unranked"
                className={`min-h-[120px] bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-3 transition-colors ${activeDropZone === 'unranked' ? 'bg-indigo-50 border-indigo-400' : ''}`}
            >
                <div className="flex flex-wrap gap-3">
                    {items.unranked.map(item => (
                       <ItemCard 
                         key={item.id} 
                         item={item} 
                         tierId="unranked" 
                         onDragStart={handleDragStart}
                         isDragging={dragItem?.id === item.id}
                         onDelete={() => deleteItem('unranked', item.id)}
                         onEdit={() => startEdit(item)}
                       />
                    ))}
                    {items.unranked.length === 0 && (
                        <div className="w-full h-20 flex items-center justify-center text-slate-400 text-sm">
                            Tout est classé ! 🎉
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Edit Modal (Simple overlay for mobile) */}
      {editingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-4 w-full max-w-sm shadow-2xl">
                  <h3 className="font-bold mb-3">Modifier</h3>
                  <input 
                    className="w-full border p-2 rounded mb-3 text-lg"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-500">Annuler</button>
                      <button onClick={() => {
                          const tier = Object.keys(items).find(key => items[key].find(i => i.id === editingId));
                          saveEdit(tier);
                      }} className="px-4 py-2 bg-indigo-600 text-white rounded">Sauvegarder</button>
                  </div>
              </div>
          </div>
      )}

      {/* Ghost Element (The visual item following finger) */}
      {dragItem && (
        <div 
            style={{ 
                position: 'fixed', 
                left: dragPosition.x, 
                top: dragPosition.y,
                transform: 'translate(-50%, -50%) rotate(5deg)',
                pointerEvents: 'none',
                zIndex: 9999,
                width: '150px'
            }}
            className="bg-indigo-600 text-white p-3 rounded-lg shadow-2xl font-bold text-center opacity-90 text-sm"
        >
            {dragItem.content}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-slate-400 text-xs py-4 px-8">
          Pour sauvegarder : clique sur le bouton de partage en haut et colle le lien dans tes Notes.
      </div>
    </div>
  );
}

// --- Composant Carte (Optimisé Touch) ---
const ItemCard = ({ item, tierId, onDragStart, isDragging, onDelete, onEdit }) => {
    return (
        <div 
            className={`
                relative group touch-none select-none
                ${isDragging ? 'opacity-30' : 'opacity-100'}
            `}
        >
            {/* La carte elle-même */}
            <div 
                onMouseDown={(e) => onDragStart(e, item, tierId)}
                onTouchStart={(e) => onDragStart(e, item, tierId)}
                className="bg-white px-3 py-2.5 rounded shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all active:scale-95 flex items-center gap-2 max-w-[150px]"
            >
                <span className="truncate font-medium text-slate-700 text-sm pointer-events-none">
                    {item.content}
                </span>
            </div>

            {/* Boutons actions (visibles au clic ou hover, petits sur mobile) */}
            <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="bg-indigo-100 text-indigo-600 p-1 rounded-full shadow hover:bg-indigo-200">
                    <Edit2 size={12} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="bg-red-100 text-red-600 p-1 rounded-full shadow hover:bg-red-200">
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};