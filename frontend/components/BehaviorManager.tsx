"use client";

import { useState } from "react";
import { GripVertical, X, Plus } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Behavior } from "@/types/behavior";

interface BehaviorManagerProps {
  behaviors: Behavior[];
  setBehaviors: (behaviors: Behavior[]) => void;
}

const BehaviorManager = ({ behaviors, setBehaviors }: BehaviorManagerProps) => {
  const [name, setName] = useState("");
  const [hotkey, setHotkey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAddBehavior = () => {
    if (name && hotkey) {
      if (hotkey.length > 1) {
        setError("Hotkey must be a single character.");
        return;
      }
      if (behaviors.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
        setError("A behavior with this name already exists.");
        return;
      }
      if (
        behaviors.some((b) => b.hotkey.toLowerCase() === hotkey.toLowerCase())
      ) {
        setError("A behavior with this hotkey already exists.");
        return;
      }
      setBehaviors([...behaviors, { name, hotkey }]);
      setName("");
      setHotkey("");
      setError(null);
    }
  };

  const handleRemoveBehavior = (index: number) => {
    const newBehaviors = behaviors.filter((_, i) => i !== index);
    setBehaviors(newBehaviors);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(behaviors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBehaviors(items);
  };

  return (
    <div className='space-y-4'>
      <div>
        <label className='block text-xs font-bold uppercase tracking-widest mb-2'>
          Behaviors
        </label>
        {error && <p className='text-destructive text-sm mb-2'>{error}</p>}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-4'>
          <input
            type='text'
            placeholder='Behavior Name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full md:col-span-3 px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring'
          />
          <input
            type='text'
            placeholder='Hotkey'
            value={hotkey}
            onChange={(e) => setHotkey(e.target.value.slice(0, 1))}
            maxLength={1}
            className='w-full md:col-span-1 px-3 py-2 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring'
          />
        </div>
        <div className='flex justify-between items-center gap-2'>
          <button
            type='button'
            onClick={() => setBehaviors([])}
            className='flex gap-2 items-center px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-main cursor-pointer hover:brightness-110 transition-all disabled:opacity-50'>
            <X size={14} />
            Clear All
          </button>
          <button
            type='button'
            onClick={handleAddBehavior}
            className='flex gap-2 items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest shadow-main cursor-pointer hover:brightness-110 transition-all disabled:opacity-50'>
            <Plus size={14} />
            Add Behavior
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId='behaviors'>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className='mt-4 space-y-2 max-h-36 overflow-y-auto'>
              {behaviors.length === 0 && (
                <p className='text-sm text-muted-foreground text-center'>
                  No behaviors added yet.
                </p>
              )}
              {behaviors.map((behavior, index) => (
                <Draggable
                  key={behavior.name}
                  draggableId={behavior.name}
                  index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        snapshot.isDragging
                          ? "bg-muted shadow-lg"
                          : "bg-background"
                      }`}>
                      <div className='flex items-center gap-2'>
                        <GripVertical
                          className='text-muted-foreground'
                          size={20}
                        />
                        <div>
                          <p className='text-sm'>
                            [{behavior.hotkey}] {" - "}
                            <span className='font-semibold'>
                              {behavior.name}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        type='button'
                        onClick={() => handleRemoveBehavior(index)}
                        className='text-muted-foreground hover:text-destructive'>
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default BehaviorManager;
