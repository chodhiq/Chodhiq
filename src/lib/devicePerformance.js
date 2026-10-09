import * as Device from 'expo-device';
import { performancePolicy } from './performancePolicy';
export const devicePerformance = Object.freeze(performancePolicy(Device.totalMemory));
