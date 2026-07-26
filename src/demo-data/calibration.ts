import { z } from "zod";

const aggregateSchema = z.object({
  sourceVersion: z.string().min(1),
  sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  observedAt: z.iso.date(),
});

const adventureWorksAggregateSchema = aggregateSchema.extend({
  departmentCount: z.number().int().min(1).max(100),
  productCategoryCount: z.number().int().min(1).max(100),
  orderCount: z.number().int().min(1),
  medianOrderLines: z.number().min(1).max(100),
});

const ineAggregateSchema = aggregateSchema.extend({
  referencePeriod: z.string().regex(/^\d{4}(?:-Q[1-4])?$/),
  activePopulationIndex: z.number().positive(),
  employmentVariationRate: z.number().min(-1).max(1),
  laborCostIndex: z.number().positive(),
});

export type ScenarioCalibration = {
  teamCount: number;
  projectPortfolioSize: number;
  workItemsPerPerson: number;
  incidentShare: number;
  monthlyEconomicVariation: number;
};

export function adaptAdventureWorksAggregates(
  value: z.input<typeof adventureWorksAggregateSchema>,
): Pick<
  ScenarioCalibration,
  "teamCount" | "projectPortfolioSize" | "workItemsPerPerson" | "incidentShare"
> {
  const aggregate = adventureWorksAggregateSchema.parse(value);
  return {
    teamCount: Math.max(3, Math.min(8, Math.round(aggregate.departmentCount / 4))),
    projectPortfolioSize: Math.max(
      6,
      Math.min(12, Math.round(aggregate.productCategoryCount * 1.6)),
    ),
    workItemsPerPerson: Math.max(
      5,
      Math.min(12, Math.round(aggregate.medianOrderLines * 1.5)),
    ),
    incidentShare: Math.max(
      0.2,
      Math.min(0.6, aggregate.productCategoryCount / aggregate.departmentCount),
    ),
  };
}

export function adaptIneAggregates(
  value: z.input<typeof ineAggregateSchema>,
): Pick<ScenarioCalibration, "monthlyEconomicVariation"> {
  const aggregate = ineAggregateSchema.parse(value);
  const combinedRate =
    aggregate.employmentVariationRate +
    (aggregate.laborCostIndex / aggregate.activePopulationIndex - 1);
  return {
    monthlyEconomicVariation: Math.max(
      -0.08,
      Math.min(0.08, combinedRate / 12),
    ),
  };
}

export function createDefaultCalibration(): ScenarioCalibration {
  return {
    teamCount: 4,
    projectPortfolioSize: 8,
    workItemsPerPerson: 7.5,
    incidentShare: 0.4,
    monthlyEconomicVariation: 0.012,
  };
}
