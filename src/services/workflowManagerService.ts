/**
 * Workflow Manager Service
 * Manages workflow CRUD operations and initialization
 */

import type { Workflow } from '../types';

import StorageService from './storageService';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('WorkflowManager');

/**
 * Generate a unique ID for workflows
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Load a sample workflow from the public directory
 */
async function loadSampleWorkflow(filename: string): Promise<Workflow | null> {
  try {
    const response = await fetch(`/samples/${filename}`);
    if (!response.ok) {
      logger.warn(`Failed to load sample file ${filename}`);
      return null;
    }
    const workflow = await response.json();
    return workflow;
  } catch (error: any) {
    logger.warn(`Failed to parse sample file ${filename}:`, error);
    return null;
  }
}

class WorkflowManagerService {
  private _initialized: boolean = false;

  /**
   * Initialize the service and create an empty workflow if needed
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    const workflows = this.getWorkflows();
    if (Object.keys(workflows).length === 0) {
      logger.info('Creating initial empty workflow...');
      // Create a single empty workflow instead of loading samples
      const emptyWorkflow = this.createNewWorkflow('Untitled Workflow');
      this.saveWorkflow(emptyWorkflow);
      this.setCurrentWorkflowId(emptyWorkflow.id);
      logger.info('Created empty workflow');
    }
    this._initialized = true;
  }

  /**
   * Load initial sample workflows
   */
  private async _loadInitialSamples(): Promise<void> {
    const sampleFiles = [
      '01_simple_workflow.json',
      '02_text_combiner_workflow.json', 
      '03_control_flow_workflow.json'
    ];

    const loadedWorkflows: Workflow[] = [];
    
    for (const filename of sampleFiles) {
      const workflow = await loadSampleWorkflow(filename);
      if (workflow) {
        // Generate new ID to avoid duplicates
        const workflowWithNewId: Workflow = {
          ...workflow,
          id: generateId(),
          lastModified: new Date().toISOString()
        };
        logger.info(`Saving sample workflow: ${workflowWithNewId.name}`, {
          nodes: workflowWithNewId.flow?.nodes?.length || 0
        });
        this.saveWorkflow(workflowWithNewId);
        loadedWorkflows.push(workflowWithNewId);
        logger.info(`Imported sample workflow "${workflow.name}"`);
      }
    }

    // Set the first loaded workflow as the current workflow
    if (loadedWorkflows.length > 0) {
      this.setCurrentWorkflowId(loadedWorkflows[0].id);
      logger.info(`Set "${loadedWorkflows[0].name}" as initial workflow`);
    } else {
      // Create a default workflow if sample files couldn't be loaded
      const newWorkflow = this.createNewWorkflow();
      this.saveWorkflow(newWorkflow);
      this.setCurrentWorkflowId(newWorkflow.id);
      logger.info('Created default workflow');
    }
  }

  /**
   * Get all workflows
   */
  getWorkflows(): Record<string, Workflow> {
    return StorageService.getWorkflows({});
  }

  /**
   * Get a specific workflow by ID, with data migration for old formats
   */
  getWorkflow(id: string): Workflow | null {
    const workflows = this.getWorkflows();
    const workflow = workflows[id] || null;

    if (!workflow) {
      return null;
    }

    // Data migration for old format
    // Old format: { id, name, nodes, connections, lastModified }
    // New format: { id, name, flow: { nodes, edges, viewport }, lastModified }
    const wfAsAny = workflow as any;
    if (workflow && !workflow.flow && (wfAsAny.nodes || wfAsAny.connections)) {
      logger.info(`Migrating old workflow format for: ${workflow.name}`);
      const migratedWorkflow: Workflow = {
        ...workflow,
        flow: {
          nodes: wfAsAny.nodes || [],
          edges: (wfAsAny.connections || []).map((c: any) => ({ ...c, type: 'custom' })),
          viewport: { x: 0, y: 0, zoom: 1 }
        }
      };
      // Clean up old top-level properties
      delete (migratedWorkflow as any).nodes;
      delete (migratedWorkflow as any).connections;

      // Save the migrated workflow back to storage to prevent re-migration
      this.saveWorkflow(migratedWorkflow);
      return migratedWorkflow;
    }

    return workflow;
  }

  /**
   * Save or update a workflow
   */
  saveWorkflow(workflowData: Workflow): void {
    if (!workflowData || !workflowData.id) {
      logger.error("Invalid workflow data provided to saveWorkflow");
      return;
    }
    // Add detailed logging to check the structure being saved
    logger.info(`Saving workflow: ${workflowData.name}`, {
      hasFlow: !!workflowData.flow,
      nodeCount: workflowData.flow?.nodes?.length || 0,
      edgeCount: workflowData.flow?.edges?.length || 0
    });
    const workflows = this.getWorkflows();
    workflows[workflowData.id] = {
      ...workflowData,
      lastModified: new Date().toISOString(),
    };
    StorageService.setWorkflows(workflows);
  }

  /**
   * Delete a workflow
   */
  deleteWorkflow(id: string): void {
    const workflows = this.getWorkflows();
    delete workflows[id];
    StorageService.setWorkflows(workflows);

    // If deleting the current workflow, switch to another or create new
    if (this.getCurrentWorkflowId() === id) {
      const remainingIds = Object.keys(workflows);
      if (remainingIds.length > 0) {
        this.setCurrentWorkflowId(remainingIds[0]);
      } else {
        const newWorkflow = this.createNewWorkflow();
        this.saveWorkflow(newWorkflow);
        this.setCurrentWorkflowId(newWorkflow.id);
      }
    }
  }

  /**
   * Get the current workflow ID
   */
  getCurrentWorkflowId(): string | null {
    return StorageService.getCurrentWorkflowId();
  }

  /**
   * Set the current workflow ID
   */
  setCurrentWorkflowId(id: string): void {
    StorageService.setCurrentWorkflowId(id);
  }

  /**
   * Create a new workflow
   */
  createNewWorkflow(name: string = 'New Workflow'): Workflow {
    const newId = generateId();
    return {
      id: newId,
      name: name,
      flow: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      lastModified: new Date().toISOString(),
    };
  }
  /**
   * Reset the service state for testing.
   * This method is intended for use in test environments only.
   */
  public reset(): void {
    this._initialized = false;
    // Clear any in-memory state if necessary
    // For example, if there were private maps or sets that hold state
    // this.somePrivateMap.clear(); 
  }
}

// Singleton instance
const workflowManagerService = new WorkflowManagerService();

export default workflowManagerService;