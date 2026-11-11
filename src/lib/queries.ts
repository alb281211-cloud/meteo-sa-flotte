import { useQuery } from "@tanstack/react-query";
import {
  fetchAirQuality,
  fetchArchive,
  fetchCityImage,
  fetchEnsemble,
  fetchForecast,
  fetchGrid,
  fetchModels,
  fetchRadarFrames,
  type Place,
} from "./api";

const MIN = 60 * 1000;

export const useForecast = (p: Place | null | undefined) =>
  useQuery({
    queryKey: ["forecast", p?.lat, p?.lon],
    queryFn: () => fetchForecast(p!.lat, p!.lon),
    enabled: !!p,
    staleTime: 10 * MIN,
    retry: 2,
  });

export const useAir = (p: Place) =>
  useQuery({ queryKey: ["air", p.lat, p.lon], queryFn: () => fetchAirQuality(p.lat, p.lon), staleTime: 20 * MIN });

export const useRadar = () =>
  useQuery({ queryKey: ["radar"], queryFn: fetchRadarFrames, staleTime: 5 * MIN, refetchInterval: 5 * MIN });

export const useCityImage = (name: string) =>
  useQuery({ queryKey: ["img", name], queryFn: () => fetchCityImage(name), staleTime: Infinity, retry: 0 });

export const useModels = (p: Place, vars: string[]) =>
  useQuery({
    queryKey: ["models", p.lat, p.lon, vars.join()],
    queryFn: () => fetchModels(p.lat, p.lon, vars),
    staleTime: 30 * MIN,
  });

export const useEnsemble = (
  p: Place,
  variable: "temperature_2m" | "precipitation" | "wind_gusts_10m",
  threshold?: number,
) =>
  useQuery({
    queryKey: ["ens", p.lat, p.lon, variable, threshold],
    queryFn: () => fetchEnsemble(p.lat, p.lon, variable, threshold),
    staleTime: 60 * MIN,
  });

export const useArchive = (p: Place, start: string, end: string, enabled = true) =>
  useQuery({
    queryKey: ["archive", p.lat, p.lon, start, end],
    queryFn: () => fetchArchive(p.lat, p.lon, start, end),
    staleTime: Infinity,
    enabled: enabled && !!start && !!end && start <= end,
  });

export const useGrid = (
  bbox: [number, number, number, number] | null,
  rows: number,
  cols: number,
  vars: string[],
  hours = 48,
) =>
  useQuery({
    queryKey: ["grid", bbox?.map((v) => v.toFixed(2)).join(), rows, cols, vars.join(), hours],
    queryFn: () => fetchGrid(bbox![0], bbox![1], bbox![2], bbox![3], rows, cols, vars, hours),
    enabled: !!bbox,
    staleTime: 20 * MIN,
    placeholderData: (prev) => prev,
  });
