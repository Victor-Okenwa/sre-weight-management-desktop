import * as z from 'zod';

export const newWeightSchema = z.object({
  operationType: z.enum(['single', 'double']),
  tareSource: z.enum(['existing', 'new']).optional(),
  vehicleName: z.string().min(1, 'Vehicle number is required'),
  materialName: z.string().optional(),
  operator: z.string().optional(),
  supplierName: z.string().optional(),
  customerName: z.string().optional(),
  remark: z.string().optional(),
});

export type NewWeightForm = z.infer<typeof newWeightSchema>;
