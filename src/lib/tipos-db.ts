// Tipos de la base de datos de Supabase (espejo de supabase/schema.sql).
// A mano en vez de generados con CLI: el esquema es pequeño y estable.
// Si cambias schema.sql, actualiza también este archivo.

export type RangoFila = string;

export interface FilaPadre {
  id: string;
  email: string | null;
  nombre: string | null;
  created_at: string;
}

export interface FilaHijo {
  id: string;
  padre_id: string;
  nombre: string;
  avatar: string | null;
  rango: RangoFila;
  graduado: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FilaProgreso {
  hijo_id: string;
  etapa: string | null;
  n: number | null;
  pesos: Record<string, number> | null;
  aciertos: Record<string, number> | null;
  score: number | null;
  leccion_id: string | null;
  actividad_idx: number | null;
  gamificacion: Record<string, unknown> | null;
  adaptabilidad: Record<string, unknown> | null;
  updated_at: string;
}

export interface FilaSesion {
  id: string;
  hijo_id: string;
  inicio: string;
  fin: string | null;
  puntos: number | null;
}

export interface Database {
  public: {
    Tables: {
      padres: {
        Row: FilaPadre;
        Insert: Partial<FilaPadre> & { id: string };
        Update: Partial<FilaPadre>;
        Relationships: [];
      };
      hijos: {
        Row: FilaHijo;
        Insert: Partial<FilaHijo> & { padre_id: string; nombre: string };
        Update: Partial<FilaHijo>;
        Relationships: [];
      };
      progreso: {
        Row: FilaProgreso;
        Insert: Partial<FilaProgreso> & { hijo_id: string };
        Update: Partial<FilaProgreso>;
        Relationships: [];
      };
      sesiones: {
        Row: FilaSesion;
        Insert: Partial<FilaSesion> & { hijo_id: string };
        Update: Partial<FilaSesion>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
