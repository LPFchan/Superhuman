import type { DatabaseSync } from "node:sqlite";
import type { StateStoreStatements } from "./super-state-shared.js";

export function createStateStoreStatements(db: DatabaseSync): StateStoreStatements {
  return {
    upsertSession: db.prepare(`
      INSERT INTO sessions (
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        execution_role,
        status,
        started_at,
        ended_at,
        updated_at,
        latest_activity_at,
        display_name,
        label,
        parent_session_key,
        last_message_id,
        last_user_turn_id,
        last_assistant_turn_id,
        capability_snapshot_json,
        sandbox_runtime_json,
        message_count,
        user_message_count,
        assistant_message_count,
        action_count,
        artifact_count,
        input_token_count,
        output_token_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        session_id = COALESCE(excluded.session_id, sessions.session_id),
        agent_id = excluded.agent_id,
        workspace_dir = excluded.workspace_dir,
        execution_role = COALESCE(excluded.execution_role, sessions.execution_role),
        status = COALESCE(excluded.status, sessions.status),
        started_at = COALESCE(excluded.started_at, sessions.started_at),
        ended_at = COALESCE(excluded.ended_at, sessions.ended_at),
        updated_at = CASE
          WHEN excluded.updated_at IS NULL THEN sessions.updated_at
          WHEN sessions.updated_at IS NULL THEN excluded.updated_at
          WHEN excluded.updated_at > sessions.updated_at THEN excluded.updated_at
          ELSE sessions.updated_at
        END,
        latest_activity_at = CASE
          WHEN excluded.latest_activity_at IS NULL THEN sessions.latest_activity_at
          WHEN sessions.latest_activity_at IS NULL THEN excluded.latest_activity_at
          WHEN excluded.latest_activity_at > sessions.latest_activity_at THEN excluded.latest_activity_at
          ELSE sessions.latest_activity_at
        END,
        display_name = COALESCE(excluded.display_name, sessions.display_name),
        label = COALESCE(excluded.label, sessions.label),
        parent_session_key = COALESCE(excluded.parent_session_key, sessions.parent_session_key),
        last_message_id = COALESCE(excluded.last_message_id, sessions.last_message_id),
        last_user_turn_id = COALESCE(excluded.last_user_turn_id, sessions.last_user_turn_id),
        last_assistant_turn_id = COALESCE(
          excluded.last_assistant_turn_id,
          sessions.last_assistant_turn_id
        ),
        capability_snapshot_json = COALESCE(
          excluded.capability_snapshot_json,
          sessions.capability_snapshot_json
        ),
        sandbox_runtime_json = COALESCE(
          excluded.sandbox_runtime_json,
          sessions.sandbox_runtime_json
        ),
        message_count = CASE
          WHEN excluded.message_count IS NULL OR excluded.message_count = 0 THEN sessions.message_count
          ELSE excluded.message_count
        END,
        user_message_count = CASE
          WHEN excluded.user_message_count IS NULL OR excluded.user_message_count = 0
            THEN sessions.user_message_count
          ELSE excluded.user_message_count
        END,
        assistant_message_count = CASE
          WHEN excluded.assistant_message_count IS NULL OR excluded.assistant_message_count = 0
            THEN sessions.assistant_message_count
          ELSE excluded.assistant_message_count
        END,
        action_count = CASE
          WHEN excluded.action_count IS NULL OR excluded.action_count = 0 THEN sessions.action_count
          ELSE excluded.action_count
        END,
        artifact_count = CASE
          WHEN excluded.artifact_count IS NULL OR excluded.artifact_count = 0
            THEN sessions.artifact_count
          ELSE excluded.artifact_count
        END,
        input_token_count = CASE
          WHEN excluded.input_token_count IS NULL OR excluded.input_token_count = 0
            THEN sessions.input_token_count
          ELSE excluded.input_token_count
        END,
        output_token_count = CASE
          WHEN excluded.output_token_count IS NULL OR excluded.output_token_count = 0
            THEN sessions.output_token_count
          ELSE excluded.output_token_count
        END
    `),
    ensureSession: db.prepare(`
      INSERT INTO sessions (
        session_key,
        agent_id,
        workspace_dir,
        message_count,
        user_message_count,
        assistant_message_count,
        action_count,
        artifact_count,
        input_token_count,
        output_token_count
      ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0)
      ON CONFLICT(session_key) DO NOTHING
    `),
    insertMessage: db.prepare(`
      INSERT OR IGNORE INTO messages (
        message_id,
        session_key,
        role,
        content_text,
        created_at,
        approx_tokens,
        transcript_message_id,
        run_id,
        sequence,
        provenance_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    touchSessionAfterMessage: db.prepare(`
      UPDATE sessions SET
        updated_at = CASE
          WHEN updated_at IS NULL OR updated_at < ? THEN ?
          ELSE updated_at
        END,
        latest_activity_at = CASE
          WHEN latest_activity_at IS NULL OR latest_activity_at < ? THEN ?
          ELSE latest_activity_at
        END,
        last_message_id = ?,
        last_user_turn_id = CASE WHEN ? IS NOT NULL THEN ? ELSE last_user_turn_id END,
        last_assistant_turn_id = CASE WHEN ? IS NOT NULL THEN ? ELSE last_assistant_turn_id END,
        message_count = message_count + 1,
        user_message_count = user_message_count + ?,
        assistant_message_count = assistant_message_count + ?,
        input_token_count = input_token_count + ?,
        output_token_count = output_token_count + ?
      WHERE session_key = ?
    `),
    upsertAction: db.prepare(`
      INSERT INTO actions (
        action_id,
        session_key,
        run_id,
        action_type,
        action_kind,
        summary,
        status,
        created_at,
        completed_at,
        verification_stage,
        verifier_kind,
        command,
        exit_code,
        capability_snapshot_json,
        sandbox_runtime_json,
        source_artifact_id,
        target_artifact_id,
        details_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(action_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, actions.session_key),
        run_id = COALESCE(excluded.run_id, actions.run_id),
        action_type = excluded.action_type,
        action_kind = COALESCE(excluded.action_kind, actions.action_kind),
        summary = excluded.summary,
        status = COALESCE(excluded.status, actions.status),
        created_at = excluded.created_at,
        completed_at = COALESCE(excluded.completed_at, actions.completed_at),
        verification_stage = COALESCE(
          excluded.verification_stage,
          actions.verification_stage
        ),
        verifier_kind = COALESCE(excluded.verifier_kind, actions.verifier_kind),
        command = COALESCE(excluded.command, actions.command),
        exit_code = COALESCE(excluded.exit_code, actions.exit_code),
        capability_snapshot_json = COALESCE(
          excluded.capability_snapshot_json,
          actions.capability_snapshot_json
        ),
        sandbox_runtime_json = COALESCE(
          excluded.sandbox_runtime_json,
          actions.sandbox_runtime_json
        ),
        source_artifact_id = COALESCE(excluded.source_artifact_id, actions.source_artifact_id),
        target_artifact_id = COALESCE(excluded.target_artifact_id, actions.target_artifact_id),
        details_json = COALESCE(excluded.details_json, actions.details_json)
    `),
    touchSessionAfterAction: db.prepare(`
      UPDATE sessions SET
        updated_at = CASE
          WHEN updated_at IS NULL OR updated_at < ? THEN ?
          ELSE updated_at
        END,
        latest_activity_at = CASE
          WHEN latest_activity_at IS NULL OR latest_activity_at < ? THEN ?
          ELSE latest_activity_at
        END,
        action_count = (SELECT COUNT(*) FROM actions WHERE session_key = ?)
      WHERE session_key = ?
    `),
    selectActions: db.prepare(`
      SELECT
        action_id,
        session_key,
        run_id,
        action_type,
        action_kind,
        summary,
        status,
        created_at,
        completed_at,
        verification_stage,
        verifier_kind,
        command,
        exit_code,
        capability_snapshot_json,
        sandbox_runtime_json,
        source_artifact_id,
        target_artifact_id,
        details_json
      FROM actions
      WHERE (? IS NULL OR session_key = ?)
        AND (? IS NULL OR run_id = ?)
      ORDER BY created_at DESC, action_id DESC
      LIMIT ?
    `),
    upsertArtifact: db.prepare(`
      INSERT INTO artifacts (
        artifact_id,
        session_key,
        message_id,
        kind,
        label,
        location,
        created_at,
        provenance_json,
        relationship_kind,
        parent_artifact_id,
        preview_artifact_id,
        full_artifact_id,
        preview_bytes,
        full_bytes,
        storage_path,
        reopened_at,
        partial_read_json,
        verification_action_id,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(artifact_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, artifacts.session_key),
        message_id = COALESCE(excluded.message_id, artifacts.message_id),
        kind = excluded.kind,
        label = COALESCE(excluded.label, artifacts.label),
        location = COALESCE(excluded.location, artifacts.location),
        created_at = excluded.created_at,
        provenance_json = COALESCE(excluded.provenance_json, artifacts.provenance_json),
        relationship_kind = COALESCE(excluded.relationship_kind, artifacts.relationship_kind),
        parent_artifact_id = COALESCE(excluded.parent_artifact_id, artifacts.parent_artifact_id),
        preview_artifact_id = COALESCE(
          excluded.preview_artifact_id,
          artifacts.preview_artifact_id
        ),
        full_artifact_id = COALESCE(excluded.full_artifact_id, artifacts.full_artifact_id),
        preview_bytes = COALESCE(excluded.preview_bytes, artifacts.preview_bytes),
        full_bytes = COALESCE(excluded.full_bytes, artifacts.full_bytes),
        storage_path = COALESCE(excluded.storage_path, artifacts.storage_path),
        reopened_at = COALESCE(excluded.reopened_at, artifacts.reopened_at),
        partial_read_json = COALESCE(excluded.partial_read_json, artifacts.partial_read_json),
        verification_action_id = COALESCE(
          excluded.verification_action_id,
          artifacts.verification_action_id
        ),
        metadata_json = COALESCE(excluded.metadata_json, artifacts.metadata_json)
    `),
    touchSessionAfterArtifact: db.prepare(`
      UPDATE sessions SET
        updated_at = CASE
          WHEN updated_at IS NULL OR updated_at < ? THEN ?
          ELSE updated_at
        END,
        latest_activity_at = CASE
          WHEN latest_activity_at IS NULL OR latest_activity_at < ? THEN ?
          ELSE latest_activity_at
        END,
        artifact_count = (SELECT COUNT(*) FROM artifacts WHERE session_key = ?)
      WHERE session_key = ?
    `),
    upsertAutomationLoopState: db.prepare(`
      INSERT INTO automation_loop_state (
        session_key,
        state,
        reason,
        wake_at,
        last_activity_at,
        last_wake_at,
        last_transition_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        state = excluded.state,
        reason = COALESCE(excluded.reason, automation_loop_state.reason),
        wake_at = excluded.wake_at,
        last_activity_at = COALESCE(
          excluded.last_activity_at,
          automation_loop_state.last_activity_at
        ),
        last_wake_at = COALESCE(excluded.last_wake_at, automation_loop_state.last_wake_at),
        last_transition_at = excluded.last_transition_at,
        updated_at = excluded.updated_at
    `),
    selectAutomationLoopState: db.prepare(`
      SELECT
        session_key,
        state,
        reason,
        wake_at,
        last_activity_at,
        last_wake_at,
        last_transition_at,
        updated_at
      FROM automation_loop_state
      WHERE session_key = ?
    `),
    insertAutomationEvent: db.prepare(`
      INSERT OR REPLACE INTO automation_events (
        event_id,
        session_key,
        run_id,
        automation_kind,
        trigger_source,
        reason,
        plan_summary,
        policy_summary,
        action_summary,
        result_status,
        evidence_posture,
        evidence_sources_json,
        verification_posture,
        verification_outcome,
        capability_posture,
        capability_mode,
        details_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    selectAutomationEvents: db.prepare(`
      SELECT
        event_id,
        session_key,
        run_id,
        automation_kind,
        trigger_source,
        reason,
        plan_summary,
        policy_summary,
        action_summary,
        result_status,
        evidence_posture,
        evidence_sources_json,
        verification_posture,
        verification_outcome,
        capability_posture,
        capability_mode,
        details_json,
        created_at
      FROM automation_events
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY created_at DESC, event_id DESC
      LIMIT ?
    `),
    upsertRuntimeInvocation: db.prepare(`
      INSERT INTO runtime_invocations (
        run_id,
        session_key,
        session_id,
        workspace_dir,
        mode,
        trigger,
        status,
        current_stage,
        started_at,
        updated_at,
        ended_at,
        parent_run_id,
        root_budget_id,
        root_abort_node_id,
        latest_error,
        verification_outcome,
        verification_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        session_key = COALESCE(excluded.session_key, runtime_invocations.session_key),
        session_id = excluded.session_id,
        workspace_dir = excluded.workspace_dir,
        mode = excluded.mode,
        trigger = COALESCE(excluded.trigger, runtime_invocations.trigger),
        status = excluded.status,
        current_stage = COALESCE(excluded.current_stage, runtime_invocations.current_stage),
        started_at = runtime_invocations.started_at,
        updated_at = excluded.updated_at,
        ended_at = COALESCE(excluded.ended_at, runtime_invocations.ended_at),
        parent_run_id = COALESCE(excluded.parent_run_id, runtime_invocations.parent_run_id),
        root_budget_id = excluded.root_budget_id,
        root_abort_node_id = excluded.root_abort_node_id,
        latest_error = COALESCE(excluded.latest_error, runtime_invocations.latest_error),
        verification_outcome = COALESCE(
          excluded.verification_outcome,
          runtime_invocations.verification_outcome
        ),
        verification_required = MAX(
          runtime_invocations.verification_required,
          excluded.verification_required
        )
    `),
    insertRuntimeStageEvent: db.prepare(`
      INSERT OR IGNORE INTO runtime_stage_events (
        event_id,
        run_id,
        session_key,
        stage,
        boundary,
        detail,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    upsertIterationBudget: db.prepare(`
      INSERT INTO iteration_budgets (
        budget_id,
        run_id,
        parent_budget_id,
        label,
        max_iterations,
        used_iterations,
        refunded_iterations,
        exhausted_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(budget_id) DO UPDATE SET
        run_id = excluded.run_id,
        parent_budget_id = COALESCE(excluded.parent_budget_id, iteration_budgets.parent_budget_id),
        label = excluded.label,
        max_iterations = excluded.max_iterations,
        used_iterations = excluded.used_iterations,
        refunded_iterations = excluded.refunded_iterations,
        exhausted_reason = COALESCE(excluded.exhausted_reason, iteration_budgets.exhausted_reason),
        created_at = iteration_budgets.created_at,
        updated_at = excluded.updated_at
    `),
    upsertAbortNode: db.prepare(`
      INSERT INTO abort_nodes (
        abort_node_id,
        run_id,
        parent_abort_node_id,
        kind,
        label,
        status,
        created_at,
        updated_at,
        aborted_at,
        completed_at,
        reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(abort_node_id) DO UPDATE SET
        run_id = excluded.run_id,
        parent_abort_node_id = COALESCE(excluded.parent_abort_node_id, abort_nodes.parent_abort_node_id),
        kind = excluded.kind,
        label = excluded.label,
        status = excluded.status,
        created_at = abort_nodes.created_at,
        updated_at = excluded.updated_at,
        aborted_at = COALESCE(excluded.aborted_at, abort_nodes.aborted_at),
        completed_at = COALESCE(excluded.completed_at, abort_nodes.completed_at),
        reason = COALESCE(excluded.reason, abort_nodes.reason)
    `),
    selectSession: db.prepare(`
      SELECT
        session_key,
        session_id,
        agent_id,
        workspace_dir,
        execution_role,
        status,
        started_at,
        ended_at,
        updated_at,
        latest_activity_at,
        display_name,
        label,
        parent_session_key,
        last_message_id,
        last_user_turn_id,
        last_assistant_turn_id,
        capability_snapshot_json,
        sandbox_runtime_json,
        message_count,
        user_message_count,
        assistant_message_count,
        action_count,
        artifact_count,
        input_token_count,
        output_token_count
      FROM sessions
      WHERE session_key = ?
    `),
    selectArtifacts: db.prepare(`
      SELECT
        artifact_id,
        session_key,
        message_id,
        kind,
        label,
        location,
        created_at,
        provenance_json,
        relationship_kind,
        parent_artifact_id,
        preview_artifact_id,
        full_artifact_id,
        preview_bytes,
        full_bytes,
        storage_path,
        reopened_at,
        partial_read_json,
        verification_action_id,
        metadata_json
      FROM artifacts
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY created_at ASC, artifact_id ASC
    `),
    selectRuntimeInvocation: db.prepare(`
      SELECT
        run_id,
        session_key,
        session_id,
        workspace_dir,
        mode,
        trigger,
        status,
        current_stage,
        started_at,
        updated_at,
        ended_at,
        parent_run_id,
        root_budget_id,
        root_abort_node_id,
        latest_error,
        verification_outcome,
        verification_required
      FROM runtime_invocations
      WHERE run_id = ?
    `),
    selectRuntimeStageEvents: db.prepare(`
      SELECT event_id, run_id, session_key, stage, boundary, detail, created_at
      FROM runtime_stage_events
      WHERE run_id = ?
      ORDER BY created_at ASC, event_id ASC
    `),
    selectIterationBudgets: db.prepare(`
      SELECT
        budget_id,
        run_id,
        parent_budget_id,
        label,
        max_iterations,
        used_iterations,
        refunded_iterations,
        exhausted_reason,
        created_at,
        updated_at
      FROM iteration_budgets
      WHERE run_id = ?
      ORDER BY created_at ASC, budget_id ASC
    `),
    selectAbortNodes: db.prepare(`
      SELECT
        abort_node_id,
        run_id,
        parent_abort_node_id,
        kind,
        label,
        status,
        created_at,
        updated_at,
        aborted_at,
        completed_at,
        reason
      FROM abort_nodes
      WHERE run_id = ?
      ORDER BY created_at ASC, abort_node_id ASC
    `),
    selectConversationWindow: db.prepare(`
      SELECT
        message_id,
        role,
        content_text,
        created_at,
        approx_tokens,
        transcript_message_id,
        sequence,
        provenance_json
      FROM messages
      WHERE session_key = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `),
    selectApproxTokens: db.prepare(`
      SELECT COALESCE(SUM(approx_tokens), 0) AS total_tokens
      FROM messages
      WHERE session_key = ?
    `),
    insertContextPressureSnapshot: db.prepare(`
      INSERT INTO context_pressure_snapshots (
        session_key,
        run_id,
        created_at,
        estimated_input_tokens,
        configured_context_limit,
        reserved_output_tokens,
        effective_context_limit,
        autocompact_buffer_tokens,
        blocking_buffer_tokens,
        autocompact_threshold,
        blocking_threshold,
        remaining_budget,
        overflow_risk,
        compaction_action_refs_json
      ) VALUES (
        $sessionKey,
        $runId,
        $createdAt,
        $estimatedInputTokens,
        $configuredContextLimit,
        $reservedOutputTokens,
        $effectiveContextLimit,
        $autocompactBufferTokens,
        $blockingBufferTokens,
        $autocompactThreshold,
        $blockingThreshold,
        $remainingBudget,
        $overflowRisk,
        $compactionActionRefsJson
      )
    `),
    selectContextPressureSnapshots: db.prepare(`
      SELECT
        session_key,
        run_id,
        created_at,
        estimated_input_tokens,
        configured_context_limit,
        reserved_output_tokens,
        effective_context_limit,
        autocompact_buffer_tokens,
        blocking_buffer_tokens,
        autocompact_threshold,
        blocking_threshold,
        remaining_budget,
        overflow_risk,
        compaction_action_refs_json
      FROM context_pressure_snapshots
      WHERE session_key = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ?
    `),
    upsertContextCollapseLedger: db.prepare(`
      INSERT INTO context_collapse_ledger (
        session_key,
        run_id,
        updated_at,
        committed_spans_json,
        staged_spans_json,
        dropped_spans_json,
        restored_artifacts_json,
        recovery_mode,
        visible_context_state,
        tokens_before,
        tokens_after,
        operator_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        run_id = COALESCE(excluded.run_id, context_collapse_ledger.run_id),
        updated_at = excluded.updated_at,
        committed_spans_json = COALESCE(
          excluded.committed_spans_json,
          context_collapse_ledger.committed_spans_json
        ),
        staged_spans_json = COALESCE(
          excluded.staged_spans_json,
          context_collapse_ledger.staged_spans_json
        ),
        dropped_spans_json = COALESCE(
          excluded.dropped_spans_json,
          context_collapse_ledger.dropped_spans_json
        ),
        restored_artifacts_json = COALESCE(
          excluded.restored_artifacts_json,
          context_collapse_ledger.restored_artifacts_json
        ),
        recovery_mode = COALESCE(excluded.recovery_mode, context_collapse_ledger.recovery_mode),
        visible_context_state = COALESCE(
          excluded.visible_context_state,
          context_collapse_ledger.visible_context_state
        ),
        tokens_before = COALESCE(excluded.tokens_before, context_collapse_ledger.tokens_before),
        tokens_after = COALESCE(excluded.tokens_after, context_collapse_ledger.tokens_after),
        operator_summary = COALESCE(
          excluded.operator_summary,
          context_collapse_ledger.operator_summary
        )
    `),
    selectContextCollapseLedger: db.prepare(`
      SELECT
        session_key,
        run_id,
        updated_at,
        committed_spans_json,
        staged_spans_json,
        dropped_spans_json,
        restored_artifacts_json,
        recovery_mode,
        visible_context_state,
        tokens_before,
        tokens_after,
        operator_summary
      FROM context_collapse_ledger
      WHERE session_key = ?
    `),
    insertMemoryWriteAudit: db.prepare(`
      INSERT OR REPLACE INTO memory_write_audits (
        audit_id,
        session_key,
        run_id,
        operation_kind,
        memory_path,
        status,
        before_hash,
        after_hash,
        before_line_count,
        after_line_count,
        source_session_keys_json,
        evidence_counts_json,
        evidence_refs_json,
        added_entries_json,
        removed_entries_json,
        changed_at,
        operator_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    selectMemoryWriteAudits: db.prepare(`
      SELECT
        audit_id,
        session_key,
        run_id,
        operation_kind,
        memory_path,
        status,
        before_hash,
        after_hash,
        before_line_count,
        after_line_count,
        source_session_keys_json,
        evidence_counts_json,
        evidence_refs_json,
        added_entries_json,
        removed_entries_json,
        changed_at,
        operator_summary
      FROM memory_write_audits
      WHERE (? IS NULL OR session_key = ?)
      ORDER BY changed_at DESC, audit_id DESC
      LIMIT ?
    `),
    upsertFrozenMemorySnapshot: db.prepare(`
      INSERT INTO frozen_memory_snapshots (
        session_key,
        snapshot_path,
        created_at,
        updated_at,
        safe_line_count,
        removed_line_count,
        blocked,
        blocked_lines_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        snapshot_path = excluded.snapshot_path,
        created_at = COALESCE(frozen_memory_snapshots.created_at, excluded.created_at),
        updated_at = excluded.updated_at,
        safe_line_count = excluded.safe_line_count,
        removed_line_count = excluded.removed_line_count,
        blocked = excluded.blocked,
        blocked_lines_json = COALESCE(
          excluded.blocked_lines_json,
          frozen_memory_snapshots.blocked_lines_json
        )
    `),
    selectFrozenMemorySnapshot: db.prepare(`
      SELECT
        session_key,
        snapshot_path,
        created_at,
        updated_at,
        safe_line_count,
        removed_line_count,
        blocked,
        blocked_lines_json
      FROM frozen_memory_snapshots
      WHERE session_key = ?
    `),
    insertTeamMemorySyncEvent: db.prepare(`
      INSERT OR REPLACE INTO team_memory_sync_events (
        event_id,
        repo_root,
        direction,
        status,
        file_count,
        transfer_hash,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    selectTeamMemorySyncEvents: db.prepare(`
      SELECT
        event_id,
        repo_root,
        direction,
        status,
        file_count,
        transfer_hash,
        details,
        created_at
      FROM team_memory_sync_events
      WHERE (? IS NULL OR repo_root = ?)
      ORDER BY created_at DESC, event_id DESC
      LIMIT ?
    `),
    upsertTeamMemorySyncState: db.prepare(`
      INSERT INTO team_memory_sync_state (
        repo_root,
        remote_root,
        last_pulled_hash,
        last_pushed_hash,
        last_sync_at,
        last_pull_at,
        last_push_at,
        last_retry_at,
        conflict_retry_count,
        blocked_files_json,
        blocked_file_reasons_json,
        uploaded_files_json,
        withheld_files_json,
        checksum_state_json,
        last_status,
        last_decision,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_root) DO UPDATE SET
        remote_root = COALESCE(excluded.remote_root, team_memory_sync_state.remote_root),
        last_pulled_hash = COALESCE(
          excluded.last_pulled_hash,
          team_memory_sync_state.last_pulled_hash
        ),
        last_pushed_hash = COALESCE(
          excluded.last_pushed_hash,
          team_memory_sync_state.last_pushed_hash
        ),
        last_sync_at = COALESCE(excluded.last_sync_at, team_memory_sync_state.last_sync_at),
        last_pull_at = COALESCE(excluded.last_pull_at, team_memory_sync_state.last_pull_at),
        last_push_at = COALESCE(excluded.last_push_at, team_memory_sync_state.last_push_at),
        last_retry_at = COALESCE(excluded.last_retry_at, team_memory_sync_state.last_retry_at),
        conflict_retry_count = excluded.conflict_retry_count,
        blocked_files_json = COALESCE(
          excluded.blocked_files_json,
          team_memory_sync_state.blocked_files_json
        ),
        blocked_file_reasons_json = COALESCE(
          excluded.blocked_file_reasons_json,
          team_memory_sync_state.blocked_file_reasons_json
        ),
        uploaded_files_json = COALESCE(
          excluded.uploaded_files_json,
          team_memory_sync_state.uploaded_files_json
        ),
        withheld_files_json = COALESCE(
          excluded.withheld_files_json,
          team_memory_sync_state.withheld_files_json
        ),
        checksum_state_json = COALESCE(
          excluded.checksum_state_json,
          team_memory_sync_state.checksum_state_json
        ),
        last_status = COALESCE(excluded.last_status, team_memory_sync_state.last_status),
        last_decision = COALESCE(excluded.last_decision, team_memory_sync_state.last_decision),
        updated_at = excluded.updated_at
    `),
    selectTeamMemorySyncState: db.prepare(`
      SELECT
        repo_root,
        remote_root,
        last_pulled_hash,
        last_pushed_hash,
        last_sync_at,
        last_pull_at,
        last_push_at,
        last_retry_at,
        conflict_retry_count,
        blocked_files_json,
        blocked_file_reasons_json,
        uploaded_files_json,
        withheld_files_json,
        checksum_state_json,
        last_status,
        last_decision,
        updated_at
      FROM team_memory_sync_state
      WHERE repo_root = ?
    `),
  };
}
