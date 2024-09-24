import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAlerts } from "services/alerts";
import { fetchDatasets } from "services/dataset";
export const fetchDatasetsThunk = createAsyncThunk('fetchData', fetchDatasets);
export const fetchAlertsThunk = createAsyncThunk('alerts', fetchAlerts);
