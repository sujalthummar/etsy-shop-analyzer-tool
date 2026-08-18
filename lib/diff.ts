export type SnapshotRow = {
  title: string | null;
  description: string | null;
  price: number | null;
  quantity: number | null;
  tags: string[] | null;
};

export type FieldChange = {
  field: "title" | "description" | "price" | "quantity" | "tags";
  old_value: string;
  new_value: string;
};

function tagsToString(tags: string[] | null): string {
  return (tags ?? []).slice().sort().join(", ");
}

/** Returns one entry per field that actually changed between two snapshots. */
export function diffSnapshots(previous: SnapshotRow, current: SnapshotRow): FieldChange[] {
  const changes: FieldChange[] = [];

  if ((previous.title ?? "") !== (current.title ?? "")) {
    changes.push({ field: "title", old_value: previous.title ?? "", new_value: current.title ?? "" });
  }
  if ((previous.description ?? "") !== (current.description ?? "")) {
    changes.push({
      field: "description",
      old_value: previous.description ?? "",
      new_value: current.description ?? "",
    });
  }
  if ((previous.price ?? 0) !== (current.price ?? 0)) {
    changes.push({
      field: "price",
      old_value: String(previous.price ?? ""),
      new_value: String(current.price ?? ""),
    });
  }
  if ((previous.quantity ?? 0) !== (current.quantity ?? 0)) {
    changes.push({
      field: "quantity",
      old_value: String(previous.quantity ?? ""),
      new_value: String(current.quantity ?? ""),
    });
  }
  const prevTags = tagsToString(previous.tags);
  const currTags = tagsToString(current.tags);
  if (prevTags !== currTags) {
    changes.push({ field: "tags", old_value: prevTags, new_value: currTags });
  }

  return changes;
}
