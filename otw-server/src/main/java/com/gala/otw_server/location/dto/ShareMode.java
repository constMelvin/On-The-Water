package com.gala.otw_server.location.dto;

/**
 * Mode of location sharing.
 * <ul>
 *   <li>{@code PIN} — static one-shot pin (e.g. meeting spot or stationary user).</li>
 *   <li>{@code LIVE} — periodically updated coordinates that auto-expire if updates cease.</li>
 * </ul>
 */
public enum ShareMode {
    PIN,
    LIVE
}
