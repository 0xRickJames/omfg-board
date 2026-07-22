"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TicketDTO } from "@/lib/tickets";
import type { WorkType } from "@/lib/models";
import TicketCard from "@/app/components/TicketCard";
import WorkTypeFilter from "@/app/components/WorkTypeFilter";

type BoardStatus = "todo" | "in_progress" | "testing" | "done";

const COLUMN_ORDER: BoardStatus[] = ["todo", "in_progress", "testing", "done"];
const COLUMN_LABELS: Record<BoardStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
};

function computeOrder(prevOrder?: number, nextOrder?: number): number {
  if (prevOrder !== undefined && nextOrder !== undefined) {
    return (prevOrder + nextOrder) / 2;
  }
  if (prevOrder !== undefined) return prevOrder + 1000;
  if (nextOrder !== undefined) return nextOrder - 1000;
  return 0;
}

function SortableTicketCard({
  ticket,
  onDelete,
}: {
  ticket: TicketDTO;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onDelete={() => onDelete(ticket._id)} />
    </div>
  );
}

function Column({
  status,
  tickets,
  onDelete,
}: {
  status: BoardStatus;
  tickets: TicketDTO[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex min-h-40 flex-1 flex-col gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {COLUMN_LABELS[status]} · {tickets.length}
      </h2>
      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2">
        <SortableContext
          items={tickets.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <SortableTicketCard key={ticket._id} ticket={ticket} onDelete={onDelete} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function BoardClient({
  initialTickets,
}: {
  initialTickets: TicketDTO[];
}) {
  const [columns, setColumns] = useState<Record<BoardStatus, TicketDTO[]>>(() => {
    const grouped: Record<BoardStatus, TicketDTO[]> = {
      todo: [],
      in_progress: [],
      testing: [],
      done: [],
    };
    for (const ticket of initialTickets) {
      if (ticket.status in grouped) {
        grouped[ticket.status as BoardStatus].push(ticket);
      }
    }
    return grouped;
  });
  const [workType, setWorkType] = useState<WorkType | "all">("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredColumns = useMemo(() => {
    if (workType === "all") return columns;
    const filtered = {} as Record<BoardStatus, TicketDTO[]>;
    for (const status of COLUMN_ORDER) {
      filtered[status] = columns[status].filter((t) => t.workType === workType);
    }
    return filtered;
  }, [columns, workType]);

  const activeTicket = useMemo(() => {
    if (!activeId) return null;
    for (const status of COLUMN_ORDER) {
      const found = columns[status].find((t) => t._id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  function findContainer(id: string): BoardStatus | undefined {
    if ((COLUMN_ORDER as string[]).includes(id)) return id as BoardStatus;
    return COLUMN_ORDER.find((status) => columns[status].some((t) => t._id === id));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceCol = findContainer(activeId);
    const destCol = (COLUMN_ORDER as string[]).includes(overId)
      ? (overId as BoardStatus)
      : findContainer(overId);
    if (!sourceCol || !destCol) return;

    const destVisible = filteredColumns[destCol].filter((t) => t._id !== activeId);
    let destIndex = destVisible.findIndex((t) => t._id === overId);
    if (destIndex === -1) destIndex = destVisible.length;
    const newOrder = computeOrder(
      destVisible[destIndex - 1]?.order,
      destVisible[destIndex]?.order,
    );

    setColumns((prev) => {
      const dragged = prev[sourceCol].find((t) => t._id === activeId);
      if (!dragged) return prev;

      const next = {} as Record<BoardStatus, TicketDTO[]>;
      for (const status of COLUMN_ORDER) {
        next[status] = prev[status].filter((t) => t._id !== activeId);
      }
      const updated = { ...dragged, status: destCol, order: newOrder };
      next[destCol] = [...next[destCol], updated].sort((a, b) => a.order - b.order);
      return next;
    });

    fetch(`/api/tickets/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: destCol, order: newOrder }),
    });
  }

  function handleDelete(id: string) {
    setColumns((prev) => {
      const next = {} as Record<BoardStatus, TicketDTO[]>;
      for (const status of COLUMN_ORDER) {
        next[status] = prev[status].filter((t) => t._id !== id);
      }
      return next;
    });
    fetch(`/api/tickets/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-6">
      <WorkTypeFilter value={workType} onChange={setWorkType} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4">
          {COLUMN_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              tickets={filteredColumns[status]}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTicket ? (
            <TicketCard ticket={activeTicket} onDelete={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
