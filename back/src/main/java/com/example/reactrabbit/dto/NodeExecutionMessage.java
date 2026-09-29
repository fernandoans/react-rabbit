package com.example.reactrabbit.dto;

public record NodeExecutionMessage(
        String workflowId,
        String currentNodeId,
        WorkflowDTO fullWorkflow
) {}