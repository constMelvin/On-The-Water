package com.gala.otw_server.photo.dto;

/**
 * A one-time Google Drive upload URL in the gala's folder. The browser PUTs the file to it;
 * Drive answers with the new file's {@code id}, which then goes to {@code POST /photos}.
 */
public record UploadSessionDto(String uploadUrl) {}
