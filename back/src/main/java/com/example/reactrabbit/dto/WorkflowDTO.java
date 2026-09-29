package com.example.reactrabbit.dto;

import java.util.List;
import java.util.Map;

public record WorkflowDTO(
        String workflowId,
        List<NodeDTO> nodes,
        List<EdgeDTO> edges
) {}