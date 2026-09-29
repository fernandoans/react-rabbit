package com.example.reactrabbit.dto;

import java.util.Map;

public record NodeDTO(
        String id,
        String type,
        Map<String, Object> data
) {}
